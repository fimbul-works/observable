import type { Observable } from "./types";
import { Signal } from "./signal";

/**
 * Represents a value that can be observed for changes.
 * Notifies observers whenever the value is updated.
 *
 * @template T The type of value being stored and observed
 * @implements {Observable<T>}
 */
export class ObservableValue<T> implements Observable<T> {
  /** Internal signal used to emit value changes */
  #signal = new Signal<T>();

  /** The current value being stored */
  #value: T;

  /**
   * Creates a new ObservableValue instance.
   * @param initial - The initial value to store
   */
  constructor(initial: T) {
    this.#value = initial;
  }

  /**
   * Retrieves the current value.
   * @returns {T} The current stored value
   */
  get(): T {
    return this.#value;
  }

  /**
   * Updates the stored value and notifies observers.
   * @param newValue - The new value to store
   */
  set(newValue: T): void {
    if (!Object.is(this.#value, newValue)) {
      this.#value = newValue;
      this.#signal.emit(newValue);
    }
  }

  /**
   * Updates the value using a transformation function and notifies observers.
   * The update is atomic - observers will only be notified once with the final value.
   * @param updateFn - Function that receives the current value and returns the new value
   */
  update(updateFn: (current: T) => T): void {
    const newValue = updateFn(this.#value);
    this.set(newValue);
  }

  /**
   * Subscribes to value changes and immediately receives the current value.
   * @param fn - Function to be called with the current value and subsequent changes
   * @returns {() => void} A cleanup function that removes the event handler
   */
  subscribe(fn: (value: T) => void): () => void {
    fn(this.#value); // Immediate call with current value
    return this.onChange(fn);
  }

  /**
   * Registers a function to be called when the value changes.
   * @param fn - Function to be called with the new value
   * @returns {() => void} A cleanup function that removes the event handler
   */
  onChange(fn: (value: T) => void): () => void {
    return this.#signal.connect(fn);
  }

  /**
   * Checks if there are any active subscribers.
   * @returns {boolean} True if there are any subscribers, false otherwise
   */
  hasObservers(): boolean {
    return this.#signal.hasHandlers();
  }

  /**
   * Returns the number of active subscribers.
   * @returns {number} The number of active subscribers
   */
  observerCount(): number {
    return this.#signal.listenerCount();
  }

  /**
   * Creates a derived ObservableValue that updates whenever this one changes.
   * @template U The type of the derived value
   * @param transform - Function to transform the value
   * @returns {ObservableValue<U>} A new ObservableValue instance
   */
  map<U>(transform: (value: T) => U): ObservableValue<U> {
    const derived = new ObservableValue<U>(transform(this.#value));
    this.onChange((value) => derived.set(transform(value)));
    return derived;
  }
}
