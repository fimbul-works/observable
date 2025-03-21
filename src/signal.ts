import type { ErrorHandler, EventHandler } from "./types";

/**
 * Signal class implements a publish/subscribe pattern for event handling with error management
 * and support for both synchronous and asynchronous operations.
 *
 * @template T The type of signal to emit
 * @template R The return type of handlers (void or Promise<void>)
 */
export class Signal<T, R = void | Promise<void>> {
  /** Event handlers */
  #handlers = new Set<EventHandler<T, R>>();

  /** Error event handlers */
  #errorHandlers = new Set<ErrorHandler>();

  /** One-time event handlers */
  #onceHandlers = new Set<EventHandler<T, R>>();

  /**
   * Registers a callback function to be executed when the signal is emitted.
   * The callback can be synchronous or asynchronous (return a Promise).
   *
   * @param fn - Function to be called when the signal is emitted
   * @returns A cleanup function that removes the handler when called
   */
  connect(fn: EventHandler<T, R>): () => void {
    this.#handlers.add(fn);
    return () => this.#handlers.delete(fn);
  }

  /**
   * Registers a one-time callback function that will be automatically removed after being called.
   * The callback can be synchronous or asynchronous (return a Promise).
   *
   * @param fn - Function to be called once when the signal is emitted
   * @returns A cleanup function that removes the handler when called
   */
  once(fn: EventHandler<T, R>): () => void {
    this.#onceHandlers.add(fn);
    return () => this.#onceHandlers.delete(fn);
  }

  /**
   * Removes a previously registered callback function.
   * @param fn - The callback function to remove. A falsy value will disconnect all subscribers.
   * @returns this for method chaining
   */
  disconnect(fn?: EventHandler<T, R>) {
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
   * This method runs synchronously and doesn't wait for any promises returned by handlers.
   *
   * @param data - The data to pass to the callback functions
   * @returns The number of handlers that were called
   */
  emit(data: T): number {
    let handlerCount = 0;

    // Handle regular subscribers
    for (const fn of this.#handlers.values()) {
      try {
        const result = fn(data);
        // If handler returns a promise, attach error handling but don't wait
        if (result instanceof Promise) {
          result.catch(this.#handleError.bind(this));
        }
        handlerCount++;
      } catch (error) {
        this.#handleError(error);
      }
    }

    // Handle one-time subscribers
    for (const fn of Array.from(this.#onceHandlers.values())) {
      try {
        const result = fn(data);
        // If handler returns a promise, attach error handling but don't wait
        if (result instanceof Promise) {
          result.catch(this.#handleError.bind(this));
        }
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
   * Triggers the signal and waits for all handlers to complete, including any that return Promises.
   *
   * @param data - The data to pass to the callback functions
   * @returns Promise resolving to the number of handlers that were called
   */
  async emitAsync(data: T): Promise<number> {
    let handlerCount = 0;
    const promises: Promise<unknown>[] = [];

    // Process regular handlers
    for (const fn of this.#handlers.values()) {
      try {
        const result = fn(data);
        if (result instanceof Promise) {
          promises.push(result.catch(this.#handleError.bind(this)));
        }
        handlerCount++;
      } catch (error) {
        this.#handleError(error);
      }
    }

    // Process one-time handlers
    for (const fn of Array.from(this.#onceHandlers.values())) {
      try {
        const result = fn(data);
        if (result instanceof Promise) {
          promises.push(result.catch(this.#handleError.bind(this)));
        }
        handlerCount++;
        this.#onceHandlers.delete(fn);
      } catch (error) {
        this.#handleError(error);
        this.#onceHandlers.delete(fn);
      }
    }

    // Wait for all promises to resolve
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    return handlerCount;
  }

  /**
   * Registers an error handler function.
   * @param fn - The error handler function to add
   * @returns A cleanup function that removes the error handler when called
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
   * @returns The number of all types of handlers combined
   */
  listenerCount(): number {
    return this.#handlers.size + this.#onceHandlers.size;
  }

  /**
   * Checks if there are any handlers registered.
   * @returns True if there are any handlers, false otherwise
   */
  hasHandlers(): boolean {
    return this.#handlers.size > 0 || this.#onceHandlers.size > 0;
  }

  /**
   * Cleans up all event subscriptions and releases resources.
   * Call this method when the signal is no longer needed.
   */
  destroy(): void {
    this.#handlers.clear();
    this.#onceHandlers.clear();
    this.#errorHandlers.clear();
  }

  /**
   * Internal method to handle errors from event handlers
   */
  #handleError(error: unknown): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    if (this.#errorHandlers.size > 0) {
      for (const errFn of this.#errorHandlers) {
        try {
          errFn(errorObj);
        } catch (err) {
          console.error("Error in error handler:", err);
        }
      }
    } else {
      console.error(errorObj);
    }
  }
}
