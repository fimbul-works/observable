import type { CollectionEvent, Observable } from "./types";

import { Signal } from "./signal";

/**
 * An observable Set implementation that emits events when its contents change.
 * Uses boolean values in events to indicate presence in the set.
 *
 * @template T The type of values stored in the set
 * @implements {Observable<CollectionEvent<T, boolean>>}
 */
export class ObservableSet<T>
  implements Observable<CollectionEvent<T, boolean>>
{
  /** Internal signal used to emit collection events */
  #signal = new Signal<CollectionEvent<T, boolean>>();

  /** Internal set instance that stores the actual data */
  #set = new Set<T>();

  /**
   * Creates a new ObservableSet instance.
   * @param values - Optional initial values for the set
   */
  constructor(values?: Iterable<T>) {
    if (values) {
      for (const value of values) {
        this.#set.add(value);
      }
    }
  }

  /**
   * Implements the Iterator protocol.
   */
  [Symbol.iterator](): IterableIterator<T> {
    return this.values();
  }

  /**
   * @returns the number of (unique) elements in Set.
   */
  get size(): number {
    return this.#set.size;
  }

  /**
   * Adds a value to the set and emits an add event if it wasn't already present.
   * @param value - The value to add to the set
   * @returns {this} The set instance for method chaining
   */
  add(value: T): this {
    const exists = this.#set.has(value);
    this.#set.add(value);

    if (!exists) {
      this.#signal.emit({
        type: "add",
        key: value,
        value: true,
      });
    }

    return this;
  }

  /**
   * Adds a value to the set and waits for all change handlers to complete.
   * @param value - The value to add
   * @returns {Promise<this>} Promise resolving to the set instance for method chaining
   */
  async addAsync(value: T): Promise<this> {
    const exists = this.#set.has(value);
    this.#set.add(value);

    if (!exists) {
      await this.#signal.emitAsync({
        type: "add",
        key: value,
        value: true,
      });
    }

    return this;
  }

  /**
   * Removes a value from the set and emits a delete event if it was present.
   * @param value - The value to remove from the set
   * @returns {boolean} True if the value was removed, false if it wasn't in the set
   */
  delete(value: T): boolean {
    const result = this.#set.delete(value);

    if (result) {
      this.#signal.emit({
        type: "delete",
        key: value,
        oldValue: true,
      });
    }

    return result;
  }

  /**
   * Deletes a value from the set and waits for all change handlers to complete.
   * @param value - The value to delete
   * @returns {Promise<boolean>} Promise resolving to true if the value was deleted, false otherwise
   */
  async deleteAsync(value: T): Promise<boolean> {
    const result = this.#set.delete(value);

    if (result) {
      await this.#signal.emitAsync({
        type: "delete",
        key: value,
        oldValue: true,
      });
    }

    return result;
  }

  /**
   * Checks if a value exists in the set.
   *
   * @param value - The value to check
   * @returns {boolean} True if the value exists in the set, false otherwise
   */
  has(value: T): boolean {
    return this.#set.has(value);
  }

  /**
   * Removes all values from the set and emits a clear event.
   */
  clear(): void {
    if (this.#set.size === 0) return;

    this.#set.clear();
    this.#signal.emit({
      type: "clear",
      key: null as T,
    });
  }

  /**
   * Clears the set and waits for all change handlers to complete.
   * @returns {Promise<void>}
   */
  async clearAsync(): Promise<void> {
    if (this.#set.size === 0) return;

    this.#set.clear();
    await this.#signal.emitAsync({
      type: "clear",
      key: null as T,
    });
  }

  /**
   * Returns an iterator over the set's values.
   * @returns {IterableIterator<T>} An iterator over the set's values
   */
  values(): IterableIterator<T> {
    return this.#set.values();
  }

  /**
   * Registers a function to be called when the set changes.
   * @param fn - Function to be called with collection events
   * @returns {() => void} A cleanup function that removes the event handler
   */
  onChange(fn: (event: CollectionEvent<T, boolean>) => void): () => void {
    return this.#signal.connect(fn);
  }

  /**
   * Creates a new Set containing all the elements from this set and the other set.
   * @param other - The other set to union with
   * @returns {ObservableSet<T>} A new ObservableSet containing the union
   */
  union(other: Set<T> | ObservableSet<T>): ObservableSet<T> {
    const result = new ObservableSet<T>(this);
    for (const value of other) {
      result.add(value);
    }
    return result;
  }

  /**
   * Creates a new Set containing elements present in both this set and the other set.
   * @param other - The other set to intersect with
   * @returns {ObservableSet<T>} A new ObservableSet containing the intersection
   */
  intersection(other: Set<T> | ObservableSet<T>): ObservableSet<T> {
    const result = new ObservableSet<T>();
    for (const value of this) {
      if (other.has(value)) {
        result.add(value);
      }
    }
    return result;
  }

  /**
   * Creates a new Set containing elements in this set that are not in the other set.
   * @param other - The other set to difference with
   * @returns {ObservableSet<T>} A new ObservableSet containing the difference
   */
  difference(other: Set<T> | ObservableSet<T>): ObservableSet<T> {
    const result = new ObservableSet<T>();
    for (const value of this) {
      if (!other.has(value)) {
        result.add(value);
      }
    }
    return result;
  }

  /**
   * Creates a new Set containing elements that are in either set but not both.
   * @param other - The other set to compute symmetric difference with
   * @returns {ObservableSet<T>} A new ObservableSet containing the symmetric difference
   */
  symmetricDifference(other: Set<T> | ObservableSet<T>): ObservableSet<T> {
    const result = new ObservableSet<T>();

    for (const value of this) {
      if (!other.has(value)) {
        result.add(value);
      }
    }

    for (const value of other) {
      if (!this.has(value)) {
        result.add(value);
      }
    }

    return result;
  }

  /**
   * Checks if this set is a subset of another set.
   * @param other - The other set to check against
   * @returns {boolean} True if this set is a subset of the other set
   */
  isSubsetOf(other: Set<T> | ObservableSet<T>): boolean {
    for (const value of this) {
      if (!other.has(value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if this set is a superset of another set.
   * @param other - The other set to check against
   * @returns {boolean} True if this set is a superset of the other set
   */
  isSupersetOf(other: Set<T> | ObservableSet<T>): boolean {
    for (const value of other) {
      if (!this.has(value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if this set has no elements in common with another set.
   * @param other - The other set to check against
   * @returns {boolean} True if the sets are disjoint
   */
  isDisjointFrom(other: Set<T> | ObservableSet<T>): boolean {
    for (const value of other) {
      if (this.has(value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Executes a provided function once per each value in the Set.
   * @param callbackfn - Function to execute for each element
   * @param thisArg - Value to use as this when executing callback
   */
  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: unknown,
  ): void {
    this.#set.forEach(callbackfn, thisArg);
  }

  /**
   * Creates a new ObservableSet with transformed elements.
   * @template U The type of elements in the new set
   * @param transform - Function to transform each element
   * @returns {ObservableSet<U>} A new ObservableSet with transformed elements
   */
  map<U>(transform: (value: T) => U): ObservableSet<U> {
    const result = new ObservableSet<U>();
    for (const value of this) {
      result.add(transform(value));
    }
    return result;
  }

  /**
   * Creates a new ObservableSet with elements that pass the test.
   * @param predicate - Function to test each element
   * @returns {ObservableSet<T>} A new filtered ObservableSet
   */
  filter(predicate: (value: T) => boolean): ObservableSet<T> {
    const result = new ObservableSet<T>();
    for (const value of this) {
      if (predicate(value)) {
        result.add(value);
      }
    }
    return result;
  }

  /**
   * Converts the set to an array.
   * @returns {Array<T>} An array containing all elements
   */
  toArray(): T[] {
    return Array.from(this);
  }

  /**
   * Converts the set to a JSON-serializable format.
   * @returns {Array<T>} An array suitable for JSON serialization
   */
  toJSON(): T[] {
    return this.toArray();
  }
}
