import type { EventHandler } from "./types";
import { ObservableMap } from "./map";
import { Signal } from "./signal";

/**
 * A strongly-typed event emitter that manages event subscriptions and emissions.
 * @template T Extends EventMap - Defines the mapping of event names to their data types.
 */

// biome-ignore lint/suspicious/noExplicitAny: The any allows specifying expected event values
export class EventEmitter<T = Record<string | symbol, any>> {
  /**
   * Internal map of event signals, where each signal corresponds to an event type.
   * @private
   */
  #signals = new ObservableMap<keyof T, Signal<T[keyof T]>>();

  /**
   * Creates a new EventEmitter instance.
   * @param events - An array of event names to initialize the emitter with.
   * @throws {Error} If no events are provided or if duplicate events are detected.
   */
  constructor(events: Array<keyof T> = []) {
    // Check for duplicates
    const duplicates = events.filter(
      (event, index) => events.indexOf(event) !== index,
    );

    if (duplicates.length > 0) {
      throw new Error(`Duplicate events detected: ${duplicates.join(", ")}`);
    }

    for (const event of events) {
      this.#signals.set(event, new Signal<T[typeof event]>());
    }
  }

  /**
   * Subscribes to an event with a callback function.
   * @template K - The event key type.
   * @param event - The event to subscribe to.
   * @param fn - The function to be called when the event is emitted.
   * @returns {this} The event emitter instance for method chaining.
   */
  on<K extends keyof T>(event: K, fn: EventHandler<T[keyof T]>): () => void {
    const signal = this.#signals.get(event);
    if (signal) return signal.connect(fn);
    return () => {};
  }

  /**
   * Unsubscribes a callback function from an event.
   * @template K - The event key type.
   * @param event - The event to unsubscribe from.
   * @param fn - The function to remove.
   * @returns {this} The event emitter instance for method chaining.
   */
  off<K extends keyof T>(event: K, fn: EventHandler<T[keyof T]>): void {
    const signal = this.#signals.get(event);
    if (signal) signal.disconnect(fn);
  }

  /**
   * Emits an event with the provided data.
   * @template K - The event key type.
   * @param event - The event to emit.
   * @param data - The data to pass to event handlers.
   * @returns {this} The event emitter instance for method chaining.
   */
  emit<K extends keyof T>(event: K, data?: T[K]): this {
    const signal = this.#signals.get(event);
    if (signal) signal.emit(data as T[K]);
    return this;
  }

  /**
   * Registers an error handler for a specific event.
   * @template K - The event key type.
   * @param event - The event to handle errors for.
   * @param fn - The function to be called when an error occurs.
   * @returns {this} The event emitter instance for method chaining.
   */
  onError<K extends keyof T>(event: K, fn: (error: Error) => void): () => void {
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
  offError<K extends keyof T>(event: K, fn: (error: Error) => void): this {
    const signal = this.#signals.get(event);
    if (signal) signal.disconnectError(fn);
    return this;
  }

  /**
   * Returns an array of all registered event names.
   * @returns {Array<keyof T>} An array containing all event names.
   */
  getEvents(): Array<keyof T> {
    return Array.from(this.#signals.keys());
  }

  /**
   * Cleans up all event subscriptions and releases resources.
   * Call this method when the event emitter is no longer needed.
   */
  destroy(): void {
    for (const [, signal] of this.#signals.entries()) {
      signal.disconnect();
    }
    this.#signals.clear();
  }
}
