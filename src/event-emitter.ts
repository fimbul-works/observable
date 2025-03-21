import type { EventHandler } from "./types";
import { ObservableMap } from "./map";
import { Signal } from "./signal";

/**
 * A strongly-typed event emitter that manages event subscriptions and emissions.
 * Supports both synchronous and asynchronous event handlers.
 *
 * @template EventMap - Defines the mapping of event names to their data types.
 */
export class EventEmitter<EventMap> {
  /**
   * Internal map of event signals, where each signal corresponds to an event type.
   * @private
   */
  #signals = new ObservableMap<
    keyof EventMap,
    Signal<EventMap[keyof EventMap]>
  >();

  /**
   * Subscribes to an event with a callback function.
   * The callback can be synchronous or asynchronous (return a Promise).
   *
   * @template K - The event key type.
   * @param event - The event to subscribe to.
   * @param fn - The function to be called when the event is emitted.
   * @returns A cleanup function that removes the handler when called.
   */
  on<K extends keyof EventMap>(
    event: K,
    fn: EventHandler<EventMap[K], void | Promise<void>>,
  ): () => void {
    if (!this.#signals.has(event)) {
      this.#signals.set(event, new Signal<EventMap[keyof EventMap]>());
    }
    const signal = this.#signals.get(event);
    if (signal)
      return signal.connect(
        fn as EventHandler<EventMap[keyof EventMap], void | Promise<void>>,
      );
    return () => {};
  }

  /**
   * Unsubscribes a callback function from an event.
   * @template K - The event key type.
   * @param event - The event to unsubscribe from.
   * @param fn - The function to remove.
   */
  off<K extends keyof EventMap>(
    event: K,
    fn: EventHandler<EventMap[K], void | Promise<void>>,
  ): void {
    const signal = this.#signals.get(event);
    if (signal)
      signal.disconnect(
        fn as EventHandler<EventMap[keyof EventMap], void | Promise<void>>,
      );
  }

  /**
   * Emits an event with the provided data.
   * This method runs synchronously and doesn't wait for any promises returned by handlers.
   *
   * @template K - The event key type.
   * @param event - The event to emit.
   * @param data - The data to pass to event handlers.
   * @returns {this} The event emitter instance for method chaining.
   */
  emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): this {
    const signal = this.#signals.get(event);
    if (signal) signal.emit(data as EventMap[K]);
    return this;
  }

  /**
   * Emits an event with the provided data and waits for all handlers to complete,
   * including any that return Promises.
   *
   * @template K - The event key type.
   * @param event - The event to emit.
   * @param data - The data to pass to event handlers.
   * @returns {Promise<this>} Promise resolving to the event emitter instance for method chaining.
   */
  async emitAsync<K extends keyof EventMap>(
    event: K,
    data?: EventMap[K],
  ): Promise<this> {
    const signal = this.#signals.get(event);
    if (signal) await signal.emitAsync(data as EventMap[K]);
    return this;
  }

  /**
   * Registers an error handler for a specific event.
   * @template K - The event key type.
   * @param event - The event to handle errors for.
   * @param fn - The function to be called when an error occurs.
   * @returns A cleanup function that removes the error handler when called.
   */
  onError<K extends keyof EventMap>(
    event: K,
    fn: (error: Error) => void,
  ): () => void {
    if (!this.#signals.has(event)) {
      this.#signals.set(event, new Signal<EventMap[keyof EventMap]>());
    }

    const signal = this.#signals.get(event);
    if (signal) return signal.connectError(fn);
    return () => {};
  }

  /**
   * Removes an error handler for a specific event.
   * @template K - The event key type.
   * @param event - The event to remove the error handler from.
   * @param fn - The error handler function to remove.
   * @returns {this} The event emitter instance for method chaining.
   */
  offError<K extends keyof EventMap>(
    event: K,
    fn: (error: Error) => void,
  ): this {
    const signal = this.#signals.get(event);
    if (signal) signal.disconnectError(fn);
    return this;
  }

  /**
   * Returns an array of all registered event names.
   * @returns {Array<keyof EventMap>} An array containing all event names.
   */
  getEvents(): Array<keyof EventMap> {
    return Array.from(this.#signals.keys());
  }

  /**
   * Cleans up all event subscriptions and releases resources.
   * Call this method when the event emitter is no longer needed.
   */
  destroy(): void {
    for (const [, signal] of this.#signals.entries()) {
      signal.destroy();
    }
    this.#signals.clear();
  }
}
