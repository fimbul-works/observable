import type { CollectionEvent, Observable } from "./types";

import { Signal } from "./signal";

/**
 * A Map implementation that notifies observers when its contents change.
 * Emits CollectionEvents for add, update, delete, and clear operations.
 *
 * @template K The type of keys in the map
 * @template V The type of values in the map
 * @implements {Observable<CollectionEvent<K, V>>}
 */
export class ObservableMap<K, V> implements Observable<CollectionEvent<K, V>> {
  /** Internal signal used to emit collection events */
  #signal = new Signal<CollectionEvent<K, V>>();

  /** Internal map instance that stores the actual data */
  #map = new Map<K, V>();

  /**
   * Creates a new ObservableMap instance.
   * @param entries - Optional initial entries for the map
   */
  constructor(entries?: Iterable<readonly [K, V]>) {
    if (entries) {
      for (const [key, value] of entries) {
        this.#map.set(key, value);
      }
    }
  }

  /** Iterator implementation */
  *[Symbol.iterator](): IterableIterator<[K, V]> {
    yield* this.#map.entries();
  }

  /**
   * Returns the number of entries in the map.
   * @returns The number of key-value pairs in the map
   */
  get size(): number {
    return this.#map.size;
  }

  /**
   * Sets a value for the specified key in the map.
   * Emits an 'add' event for new entries or an 'update' event for existing ones.
   * @param key - The key to set
   * @param value - The value to associate with the key
   * @returns {this} The map instance for method chaining
   */
  set(key: K, value: V): this {
    const exists = this.#map.has(key);
    const oldValue = this.#map.get(key);

    if (oldValue !== undefined && oldValue === value) return this;

    this.#map.set(key, value);

    this.#signal.emit({
      type: exists ? "update" : "add",
      key,
      value,
      oldValue,
    });

    return this;
  }

  /**
   * Sets a value for the specified key and waits for all change handlers to complete.
   * @param key - The key to set
   * @param value - The value to associate with the key
   * @returns {Promise<this>} Promise resolving to the map instance for method chaining
   */
  async setAsync(key: K, value: V): Promise<this> {
    const exists = this.#map.has(key);
    const oldValue = this.#map.get(key);

    if (oldValue !== undefined && oldValue === value) return this;

    this.#map.set(key, value);

    await this.#emitAsync({
      type: exists ? "update" : "add",
      key,
      value,
      oldValue,
    });

    return this;
  }

  /**
   * Retrieves the value associated with a key.
   * @param key - The key to look up
   * @returns {V | undefined} The value associated with the key, or undefined if the key doesn't exist
   */
  get(key: K): V | undefined {
    return this.#map.get(key);
  }

  /**
   * Checks if a key exists in the map.
   * @param key - The key to check
   * @returns {boolean} True if the key exists, false otherwise
   */
  has(key: K): boolean {
    return this.#map.has(key);
  }

  /**
   * Removes a key and its associated value from the map.
   * Emits a 'delete' event if the key existed.
   * @param key - The key to remove
   * @returns {boolean} True if the key was removed, false if it didn't exist
   */
  delete(key: K): boolean {
    const value = this.#map.get(key);
    const result = this.#map.delete(key);

    if (result) {
      this.#signal.emit({
        type: "delete",
        key,
        oldValue: value,
      });
    }

    return result;
  }

  /**
   * Deletes a key-value pair and waits for all change handlers to complete.
   * @param key - The key to delete
   * @returns {Promise<boolean>} Promise resolving to true if the key was deleted, false otherwise
   */
  async deleteAsync(key: K): Promise<boolean> {
    const value = this.#map.get(key);
    const result = this.#map.delete(key);

    if (result) {
      await this.#emitAsync({
        type: "delete",
        key,
        oldValue: value,
      });
    }

    return result;
  }

  /**
   * Removes all entries from the map.
   * Emits a 'clear' event.
   */
  clear(): void {
    if (this.#map.size === 0) return;

    this.#map.clear();
    this.#signal.emit({
      type: "clear",
      key: null as K,
    });
  }

  /**
   * Clears the map and waits for all change handlers to complete.
   * @returns {Promise<void>}
   */
  async clearAsync(): Promise<void> {
    if (this.#map.size === 0) return;

    this.#map.clear();
    await this.#emitAsync({
      type: "clear",
      key: null as K,
    });
  }

  /**
   * Returns an iterator over the map's values.
   * @returns {IterableIterator<V>} An iterator over the map's values
   */
  values(): IterableIterator<V> {
    return this.#map.values();
  }

  /**
   * Returns an iterator over the map's keys.
   * @returns {IterableIterator<K>} An iterator over the map's keys
   */
  keys(): IterableIterator<K> {
    return this.#map.keys();
  }

  /**
   * Returns an iterator over the map's entries.
   * @returns {IterableIterator<[K, V]>} An iterator over the map's key-value pairs
   */
  entries(): IterableIterator<[K, V]> {
    return this.#map.entries();
  }

  /**
   * Registers a function to be called when the map changes.
   * @param fn - Function to be called with collection events
   * @returns {() => void} A cleanup function that removes the listener
   */
  onChange(fn: (event: CollectionEvent<K, V>) => void): () => void {
    return this.#signal.connect(fn);
  }

  /**
   * Executes a provided function once per each key/value pair in the Map, in insertion order.
   * @param fn - Function to be called
   */
  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: unknown,
  ): void {
    this.#map.forEach(callbackfn, thisArg);
  }

  /**
   * Creates a new ObservableMap with the results of calling a provided function on every element.
   * @template U The type of values in the new map
   * @param callbackfn - Function that produces a value for the new map
   * @returns A new ObservableMap with each value transformed by the function
   */
  map<U>(callbackfn: (value: V, key: K, map: this) => U): ObservableMap<K, U> {
    const result = new ObservableMap<K, U>();
    for (const [key, value] of this) {
      result.set(key, callbackfn(value, key, this));
    }
    return result;
  }

  /**
   * Creates a new ObservableMap with all elements that pass the test.
   * @param predicate - Function to test each entry of the map
   * @returns A new ObservableMap with the entries that passed the test
   */
  filter(
    predicate: (value: V, key: K, map: this) => boolean,
  ): ObservableMap<K, V> {
    const result = new ObservableMap<K, V>();
    for (const [key, value] of this) {
      if (predicate(value, key, this)) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * Converts the map to a plain object.
   * Note: Keys must be strings or symbols.
   * @returns A plain object with the same entries as the map
   * @throws {TypeError} If any key is not a string or symbol
   */
  toObject(): Record<string | symbol, V> {
    const obj: Record<string | symbol, V> = {};
    for (const [key, value] of this) {
      if (typeof key !== "string" && typeof key !== "symbol") {
        throw new TypeError("toObject() requires string or symbol keys");
      }
      obj[key] = value;
    }
    return obj;
  }

  /**
   * Converts the map to a JSON-serializable format.
   * Note: Values must be JSON-serializable.
   * @returns An array of entries suitable for JSON serialization
   */
  toJSON(): Array<[string, unknown]> {
    return Array.from(this.#map.entries()).map(([key, value]) => [
      String(key),
      value,
    ]);
  }

  /**
   * Emits a change event asynchronously and waits for all handlers to complete.
   * @param event - The collection event to emit
   * @returns {Promise<number>} Promise resolving to the number of handlers called
   */
  async #emitAsync(event: CollectionEvent<K, V>): Promise<number> {
    return this.#signal.emitAsync(event);
  }
}
