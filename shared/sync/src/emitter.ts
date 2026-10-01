type Listener = (...args: never[]) => void;

/** Minimal typed event emitter. */
export class Emitter<Events extends Record<string, Listener>> {
  #listeners = new Map<keyof Events, Set<Listener>>();

  on<E extends keyof Events>(event: E, listener: Events[E]): void {
    const set = this.#listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.#listeners.set(event, set);
  }

  off<E extends keyof Events>(event: E, listener: Events[E]): void {
    this.#listeners.get(event)?.delete(listener);
  }

  protected emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): void {
    for (const listener of this.#listeners.get(event) ?? []) {
      (listener as (...a: Parameters<Events[E]>) => void)(...args);
    }
  }

  protected clearListeners(): void {
    this.#listeners.clear();
  }
}
