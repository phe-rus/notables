import { MediaExchange, type PeerMedia } from "../peer/media-exchange";

/** Files are requested from the documents already visible over this session. */
export class SessionMedia {
  readonly #exchange: MediaExchange;
  #active = false;
  #timer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    media: PeerMedia,
    referenced: () => Iterable<string>,
    send: (bytes: Uint8Array) => void | Promise<void>,
    arrived: (id: string) => void,
  ) {
    this.#exchange = new MediaExchange(
      media,
      referenced,
      async (_, bytes) => {
        if (this.#active) await send(bytes);
      },
      arrived,
    );
  }
  attach(direct: boolean) {
    if (!direct) {
      this.detach();
      return;
    }
    this.#active = true;
    this.refresh();
  }
  detach() {
    this.#active = false;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#exchange.disconnect("peer");
  }
  refresh() {
    if (!this.#active || this.#timer) return;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (this.#active) void this.#exchange.fetchMissing(["peer"]).catch(() => {});
    }, 50);
  }
  receive(bytes: Uint8Array) {
    if (this.#active) void this.#exchange.receive("peer", bytes, ["peer"]).catch(() => {});
  }
}
