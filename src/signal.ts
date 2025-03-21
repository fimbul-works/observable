import type { ErrorHandler, EventHandler } from "./types";

/**
 * Signal class implements a publish/subscribe pattern for event handling with error management.
 *
 * @template T The type of signal to emit
 */
export class Signal<T> {
  /** Event handlers */
  #handlers = new Set<EventHandler<T>>();

  /** Error event handlers */
  #errorHandlers = new Set<ErrorHandler>();

  /** One-time event handlers */
  #onceHandlers = new Set<EventHandler<T>>();

  /**
   * Registers a callback function to be executed when the signal is emitted.
   * @param fn - Function to be called when the signal is emitted
   * @returns this for method chaining
   */
  connect(fn: EventHandler<T>): () => void {
    this.#handlers.add(fn);
    return () => this.#handlers.delete(fn);
  }

  /**
   * Registers a one-time callback function that will be automatically removed after being called.
   * @param fn - Function to be called once when the signal is emitted
   * @returns this for method chaining
   */
  once(fn: EventHandler<T>): () => void {
    this.#onceHandlers.add(fn);
    return () => this.#onceHandlers.delete(fn);
  }

  /**
   * Removes a previously registered callback function.
   * @param fn - The callback function to remove. A falsy value will disconnect all subscribers.
   * @returns this for method chaining
   */
  disconnect(fn?: EventHandler<T>) {
    if (!fn) {
      this.#handlers.clear();
      this.#onceHandlers.clear();
    } else {
      this.#handlers.delete(fn);
      this.#onceHandlers.delete(fn);
    }
    return this;
  }

  /**
   * Triggers the signal, executing all registered callbacks with the provided data.
   * If a callback throws an error, it will be caught and handled by error handlers if registered,
   * or logged to console if no error handlers exist.
   * @param data - The data to pass to the callback functions
   * @returns The number of handlers that were called
   */
  emit(data: T): number {
    let handlerCount = 0;

    // Handle regular subscribers
    for (const fn of this.#handlers.values()) {
      try {
        fn(data);
        handlerCount++;
      } catch (error) {
        this.#handleError(error);
      }
    }

    // Handle one-time subscribers
    for (const fn of this.#onceHandlers.values()) {
      try {
        fn(data);
        handlerCount++;
        this.#onceHandlers.delete(fn);
      } catch (error) {
        this.#handleError(error);
        this.#onceHandlers.delete(fn);
      }
    }

    return handlerCount;
  }

  /**
   * Registers an error handler function.
   * @param fn - The error handler function to add
   * @returns this for method chaining
   */
  connectError(fn: ErrorHandler): () => void {
    this.#errorHandlers.add(fn);
    return () => this.#errorHandlers.delete(fn);
  }

  /**
   * Removes a previously registered error handler function.
   * @param fn - The error handler function to remove
   * @returns this for method chaining
   */
  disconnectError(fn: ErrorHandler) {
    this.#errorHandlers.delete(fn);
    return this;
  }

  /**
   * Returns the total number of handlers currently registered.
   * @returns The number of regular and one-time handlers combined
   */
  listenerCount(): number {
    return this.#handlers.size + this.#onceHandlers.size;
  }

  /**
   * Checks if there are any handlers registered.
   * @returns True if there are any regular or one-time handlers, false otherwise
   */
  hasHandlers(): boolean {
    return this.#handlers.size > 0 || this.#onceHandlers.size > 0;
  }

  /**
   * Cleans up all event subscriptions and releases resources.
   * Call this method when the event emitter is no longer needed.
   */
  destroy() {
    for (const handler of this.#handlers) {
      this.disconnect(handler);
    }
    for (const handler of this.#errorHandlers) {
      this.disconnectError(handler);
    }
  }

  /**
   * Internal method to handle errors from event handlers
   */
  #handleError(error: unknown): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    if (this.#errorHandlers.size > 0) {
      for (const errFn of this.#errorHandlers) {
        errFn(errorObj);
      }
    } else {
      console.error(errorObj);
    }
  }
}
