import { ObservableMap } from "./map";

/**
 * A strict key-value registry that enforces unique registration and required existence.
 * Extends ObservableMap to provide change notifications while adding stricter guarantees.
 *
 * @template K The type of keys in the registry
 * @template V The type of values in the registry
 * @extends {ObservableMap<K, V>}
 */
export class ObservableRegistry<K, V> extends ObservableMap<K, V> {
  /**
   * Registers a new key-value pair in the registry.
   * Throws an error if the key is already registered.
   *
   * @param key - The key to register
   * @param value - The value to associate with the key
   * @returns {this} The registry instance for method chaining
   * @throws {Error} If the key is already registered
   */
  register(key: K, value: V): this {
    if (this.has(key)) {
      throw new Error(`Already registered: ${String(key)}`);
    }
    return this.set(key, value);
  }

  /**
   * Registers a new key-value pair and waits for all change handlers to complete.
   * @param key - The key to register
   * @param value - The value to associate with the key
   * @returns {Promise<this>} Promise resolving to the registry instance for method chaining
   * @throws {Error} If the key is already registered
   */
  async registerAsync(key: K, value: V): Promise<this> {
    if (this.has(key)) {
      throw new Error(`Already registered: ${String(key)}`);
    }
    return this.setAsync(key, value);
  }

  /**
   * Removes a registered key-value pair from the registry.
   *
   * @param key - The key to unregister
   * @returns {boolean} True if the key was unregistered, false if it wasn't registered
   */
  unregister(key: K): boolean {
    return this.delete(key);
  }

  /**
   * Removes a registered key-value pair and waits for all change handlers to complete.
   * @param key - The key to unregister
   * @returns {Promise<boolean>} Promise resolving to true if the key was unregistered, false otherwise
   */
  async unregisterAsync(key: K): Promise<boolean> {
    return this.deleteAsync(key);
  }

  /**
   * Retrieves a value from the registry by its key.
   * Unlike the parent ObservableMap, this method throws if the key doesn't exist.
   * @param key - The key to look up
   * @param throwErrorOnMissing - Throws error when a key is registered if true
   * @returns {V} The value associated with the key
   * @throws {Error} If the key is not registered
   * @override
   */
  get(key: K, throwErrorOnMissing = true): V | undefined {
    const value = super.get(key);
    if (value === undefined && throwErrorOnMissing) {
      throw new Error(`Not registered: ${String(key)}`);
    }
    return value;
  }

  /**
   * Updates a registered value if it exists.
   * Unlike set(), this method throws if the key doesn't exist.
   * @param key - The key to update
   * @param value - The new value to associate with the key
   * @returns {this} The registry instance for method chaining
   * @throws {Error} If the key is not registered
   */
  update(key: K, value: V): this {
    if (!this.has(key)) {
      throw new Error(`Cannot update: ${String(key)} is not registered`);
    }
    return this.set(key, value);
  }

  /**
   * Updates a registered value and waits for all change handlers to complete.
   * @param key - The key to update
   * @param value - The new value to associate with the key
   * @returns {Promise<this>} Promise resolving to the registry instance for method chaining
   * @throws {Error} If the key is not registered
   */
  async updateAsync(key: K, value: V): Promise<this> {
    if (!this.has(key)) {
      throw new Error(`Cannot update: ${String(key)} is not registered`);
    }
    return this.setAsync(key, value);
  }

  /**
   * Updates a registered value using a transformation function.
   * Throws if the key doesn't exist.
   * @param key - The key to update
   * @param updateFn - Function that receives the current value and returns the new value
   * @returns {this} The registry instance for method chaining
   * @throws {Error} If the key is not registered
   */
  updateWith(key: K, updateFn: (currentValue: V) => V): this {
    const currentValue = this.get(key) as V;
    return this.set(key, updateFn(currentValue));
  }

  /**
   * Updates a registered value using a transformation function and waits for all change handlers to complete.
   * @param key - The key to update
   * @param updateFn - Function that receives the current value and returns the new value
   * @returns {Promise<this>} Promise resolving to the registry instance for method chaining
   * @throws {Error} If the key is not registered
   */
  async updateWithAsync(
    key: K,
    updateFn: (currentValue: V) => V,
  ): Promise<this> {
    const currentValue = this.get(key) as V;
    return this.setAsync(key, updateFn(currentValue));
  }

  /**
   * Checks if all provided keys are registered.
   * @param keys - The keys to check
   * @returns {boolean} True if all keys are registered, false otherwise
   */
  hasAll(keys: Iterable<K>): boolean {
    for (const key of keys) {
      if (!this.has(key)) {
        return false;
      }
    }
    return true;
  }
}
