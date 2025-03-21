# @fimbul-works/observable

A lightweight, type-safe Observable library for TypeScript that provides reactive programming primitives with strong typing support.

[![npm version](https://badge.fury.io/js/%40fimbul-works%2Fobservable.svg)](https://www.npmjs.com/package/@fimbul-works/observable)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/microsoft/TypeScript)

## Features

- 🎯 Fully type-safe with TypeScript
- 🪶 Lightweight with zero dependencies
- 🏃‍♂️ High-performance implementation
- 🧩 Modular design with multiple observable patterns
- ⏱️ Full async support with Promise-based APIs

## Installation

```bash
npm install @fimbul-works/observable
```

or

```bash
yarn add @fimbul-works/observable
```

## Usage

The library provides several observable patterns:

### Signal

A low-level primitive for implementing publish/subscribe patterns with error handling and async support.

Example:
```typescript
import { Signal } from '@fimbul-works/observable';

const signal = new Signal<string>();

// Connect handler with automatic cleanup
const cleanup = signal.connect((message) => {
  console.log(`Received: ${message}`);
});

// One-time handler
signal.once((message) => {
  console.log(`Received once: ${message}`);
});

// Error handling
const errorCleanup = signal.connectError((error) => {
  console.error('Handler error:', error);
});

// Synchronous emit (doesn't wait for async handlers)
signal.emit('Hello!');

// Async emit (waits for all handlers, including promises)
await signal.emitAsync('Hello with waiting!');

// Cleanup handlers and resources when done
signal.destroy();

// Or remove specific listeners
cleanup();
errorCleanup();
```

### EventEmitter

A strongly-typed event emitter for handling multiple event types with async support.

```typescript
import { EventEmitter } from '@fimbul-works/observable';

// Define your event types
interface AppEvents {
  userLogin: { userId: string, timestamp: number };
  error: Error;
  notify: string;
}

// Create an event emitter with typed events
const events = new EventEmitter<AppEvents>();

// Subscribe with cleanup function
const cleanup = events.on('userLogin', async ({ userId, timestamp }) => {
  console.log(`User ${userId} logged in at ${timestamp}`);
  await saveLoginToDatabase(userId, timestamp);
});

const errorCleanup = events.onError('userLogin', (error) => {
  console.error('Error in login handler:', error);
});

// Emit events synchronously (doesn't wait for async handlers)
events.emit('userLogin', { userId: 'alice', timestamp: Date.now() });

// Emit events and wait for all handlers to complete
await events.emitAsync('userLogin', { userId: 'bob', timestamp: Date.now() });

// Cleanup when done
cleanup();
errorCleanup();
```

### ObservableValue

A simple value container that notifies observers when the value changes, with async support.

```typescript
import { ObservableValue } from '@fimbul-works/observable';

const counter = new ObservableValue(0);

// Subscribe to changes
const unsubscribe = counter.onChange((value) => {
  console.log(`Counter changed to: ${value}`);
});

// Update synchronously
counter.set(1); // Logs: "Counter changed to: 1"

// Update with an async transformation
await counter.updateAsync(value => value + 1); // Waits for all handlers

// Cleanup when done
unsubscribe();
```

### ObservableMap

A Map implementation that emits events when entries are added, updated, or removed, with async support.

```typescript
import { ObservableMap } from '@fimbul-works/observable';

const users = new ObservableMap<string, User>();

users.onChange(async (event) => {
  switch (event.type) {
    case 'add':
      console.log(`Added user: ${event.value.name}`);
      await saveUserToDatabase(event.value);
      break;
    case 'update':
      console.log(`Updated user: ${event.value.name}`);
      await updateUserInDatabase(event.value);
      break;
    case 'delete':
      console.log(`Deleted user: ${event.key}`);
      await deleteUserFromDatabase(event.key);
      break;
  }
});

// Synchronous operations (don't wait for async handlers)
users.set('user1', { id: 1, name: 'Alice' });
users.delete('user1');

// Asynchronous operations (wait for all handlers to complete)
await users.setAsync('user2', { id: 2, name: 'Bob' });
await users.deleteAsync('user2');
await users.clearAsync();
```

### ObservableSet

A Set implementation that notifies observers of additions and removals, with async support.

```typescript
import { ObservableSet } from '@fimbul-works/observable';

const activeUsers = new ObservableSet<string>();

activeUsers.onChange(async (event) => {
  switch (event.type) {
    case 'add':
      console.log(`User became active: ${event.key}`);
      await updateUserStatus(event.key, 'active');
      break;
    case 'delete':
      console.log(`User became inactive: ${event.key}`);
      await updateUserStatus(event.key, 'inactive');
      break;
  }
});

// Synchronous operations
activeUsers.add('alice');

// Asynchronous operations (wait for all handlers)
await activeUsers.addAsync('bob');
await activeUsers.deleteAsync('alice');
await activeUsers.clearAsync();
```

### ObservableRegistry

A stricter version of ObservableMap that enforces unique registration and required existence, with async support.

```typescript
import { ObservableRegistry } from '@fimbul-works/observable';

const plugins = new ObservableRegistry<string, Plugin>();

// Will throw if 'logger' is already registered
plugins.register('logger', new LoggerPlugin());

// Async registration (waits for all change handlers)
await plugins.registerAsync('database', new DatabasePlugin());

// Will throw if 'unknown' is not registered
const logger = plugins.get('logger');

// Update a registered value
plugins.update('logger', new EnhancedLoggerPlugin());

// Update with async handlers
await plugins.updateAsync('database', new OptimizedDatabasePlugin());

// Update using a transformation function
plugins.updateWith('logger', (currentPlugin) => {
  currentPlugin.level = 'debug';
  return currentPlugin;
});

// Async transformation (waits for all handlers)
await plugins.updateWithAsync('database', async (db) => {
  await db.optimize();
  return db;
});
```

## API Documentation

### ObservableValue<T>

- `constructor(initial: T)`: Creates a new observable value
- `get(): T`: Returns the current value
- `set(newValue: T): this`: Updates the value and notifies observers
- `setAsync(newValue: T): Promise<this>`: Updates the value and waits for all observers
- `update(updateFn: (current: T) => T): this`: Updates the value using a transform function
- `updateAsync(updateFn: (current: T) => T): Promise<this>`: Updates with a transform and waits for all observers
- `subscribe(fn: (value: T) => void): () => void`: Immediately calls with current value and subscribes to changes
- `onChange(fn: (value: T) => void): () => void`: Subscribes to value changes and returns cleanup function

### ObservableMap<K, V>

- `set(key: K, value: V): this`: Sets a value for a key
- `setAsync(key: K, value: V): Promise<this>`: Sets a value and waits for all handlers
- `get(key: K): V | undefined`: Gets a value by key
- `delete(key: K): boolean`: Removes a key-value pair
- `deleteAsync(key: K): Promise<boolean>`: Removes a key-value pair and waits for all handlers
- `clear(): void`: Removes all entries
- `clearAsync(): Promise<void>`: Removes all entries and waits for all handlers
- `has(key: K): boolean`: Checks if a key exists
- `size: number`: Number of entries in the map
- `onChange(fn: (event: CollectionEvent<K, V>) => void): () => void`: Subscribes to changes

### ObservableSet<T>

- `add(value: T): this`: Adds a value to the set
- `addAsync(value: T): Promise<this>`: Adds a value and waits for all handlers
- `delete(value: T): boolean`: Removes a value
- `deleteAsync(value: T): Promise<boolean>`: Removes a value and waits for all handlers
- `has(value: T): boolean`: Checks if a value exists
- `clear(): void`: Removes all values
- `clearAsync(): Promise<void>`: Removes all values and waits for all handlers
- `size: number`: Number of values in the set
- `values(): IterableIterator<T>`: Returns an iterator of values
- `onChange(fn: (event: CollectionEvent<T, boolean>) => void): () => void`: Subscribes to changes

### ObservableRegistry<K, V>

Extends ObservableMap with:
- `register(key: K, value: V): this`: Registers a new key-value pair (throws if key exists)
- `registerAsync(key: K, value: V): Promise<this>`: Registers a key-value pair and waits for all handlers
- `unregister(key: K): boolean`: Removes a registration
- `unregisterAsync(key: K): Promise<boolean>`: Removes a registration and waits for all handlers
- `get(key: K, throwErrorOnMissing = true): V | undefined`: Gets a value (throws if key doesn't exist and throwErrorOnMissing is true)
- `update(key: K, value: V): this`: Updates an existing key (throws if key doesn't exist)
- `updateAsync(key: K, value: V): Promise<this>`: Updates an existing key and waits for all handlers
- `updateWith(key: K, updateFn: (currentValue: V) => V): this`: Updates using a transform function
- `updateWithAsync(key: K, updateFn: (currentValue: V) => V): Promise<this>`: Updates with transform and waits for all handlers

### EventEmitter<EventMap>

- `on<K extends keyof EventMap>(event: K, fn: (data: EventMap[K]) => void | Promise<void>): () => void`: Subscribes to an event
- `off<K extends keyof EventMap>(event: K, fn: (data: EventMap[K]) => void | Promise<void>): void`: Unsubscribes from an event
- `emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): this`: Emits an event synchronously
- `emitAsync<K extends keyof EventMap>(event: K, data?: EventMap[K]): Promise<this>`: Emits an event and waits for all handlers
- `onError<K extends keyof EventMap>(event: K, fn: (error: Error) => void): () => void`: Handles errors for an event
- `offError<K extends keyof EventMap>(event: K, fn: (error: Error) => void): this`: Removes error handler
- `getEvents(): Array<keyof EventMap>`: Returns all registered event names
- `destroy(): void`: Cleans up all subscriptions

### Signal<T>

- `connect(fn: (data: T) => void | Promise<void>): () => void`: Adds an event handler and returns cleanup function
- `once(fn: (data: T) => void | Promise<void>): () => void`: Adds a one-time event handler
- `disconnect(fn?: (data: T) => void | Promise<void>): this`: Removes specific handler or all handlers
- `emit(data: T): number`: Emits data to all handlers synchronously
- `emitAsync(data: T): Promise<number>`: Emits data and waits for all handlers (including promises)
- `connectError(fn: (error: Error) => void): () => void`: Adds error handler
- `disconnectError(fn: (error: Error) => void): this`: Removes error handler
- `hasHandlers(): boolean`: Checks if there are any active handlers
- `listenerCount(): number`: Returns the total number of handlers
- `destroy(): void`: Cleans up all subscriptions and releases resources

## What's New in v2.1.0

- **Comprehensive Async Support**: Added Promise-based async variants for all core operations.
- **Enhanced EventEmitter**: Now properly handles and awaits async event handlers.
- **Improved Signal**: Added `emitAsync` method that waits for all handlers to complete.
- **Collection Updates**: ObservableMap, ObservableSet, and ObservableRegistry now support async operations.
- **ObservableValue Enhancements**: Added `setAsync` and `updateAsync` methods.

## Breaking Changes in v2.0.0

- **EventEmitter Changes**: The `EventEmitter` constructor no longer accepts an events array. Events are now dynamically registered when handlers are attached using `on()` or `onError()`.
- **Type Safety**: The `EventEmitter` class now provides stricter type safety for event data while allowing more flexible usage patterns.
- **Signal Enhancements**: Added a `destroy()` method to properly clean up resources.

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

Built with ⚡ by [FimbulWorks](https://github.com/fimbul-works)
