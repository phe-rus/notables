export type SessionRequestHandler = (method: string, input: unknown) => Promise<unknown>;
interface Reply {
  type: "reply";
  id: string;
  ok: boolean;
  value?: unknown;
}
interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Requests travel inside authenticated control frames, never through a separate HTTP service. */
export class SessionRequests {
  #pending = new Map<string, Pending>();
  constructor(private readonly send: (message: unknown) => void) {}
  request(method: string, input: unknown): Promise<unknown> {
    if (this.#pending.size >= 8) return Promise.reject(new Error("Too many requests"));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error("Phone did not answer"));
      }, 15000);
      this.#pending.set(id, { resolve, reject, timer });
      this.send({ type: "request", id, method, input });
    });
  }
  receive(message: unknown): boolean {
    if (!message || typeof message !== "object") return false;
    const reply = message as Partial<Reply>;
    if (reply.type !== "reply" || typeof reply.id !== "string") return false;
    const pending = this.#pending.get(reply.id);
    if (!pending) return true;
    clearTimeout(pending.timer);
    this.#pending.delete(reply.id);
    if (reply.ok) pending.resolve(reply.value);
    else pending.reject(new Error("Phone could not complete the request"));
    return true;
  }
  detach() {
    for (const request of this.#pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error("Phone disconnected"));
    }
    this.#pending.clear();
  }
}

export class SessionResponder {
  #active = 0;
  #handler: SessionRequestHandler | null = null;
  constructor(private readonly send: (reply: unknown) => void) {}
  handle(handler: SessionRequestHandler) {
    this.#handler = handler;
  }
  receive(message: unknown): boolean {
    if (!message || typeof message !== "object") return false;
    const request = message as { type?: unknown; id?: unknown; method?: unknown; input?: unknown };
    if (
      request.type !== "request" ||
      typeof request.id !== "string" ||
      !/^[\w-]{6,64}$/.test(request.id) ||
      typeof request.method !== "string"
    )
      return false;
    const id = request.id;
    if (!this.#handler || this.#active >= 8) {
      this.send({ type: "reply", id, ok: false });
      return true;
    }
    this.#active++;
    void this.#handler(request.method, request.input)
      .then(
        (value) => this.send({ type: "reply", id, ok: true, value }),
        () => this.send({ type: "reply", id, ok: false }),
      )
      .finally(() => {
        this.#active--;
      });
    return true;
  }
}
