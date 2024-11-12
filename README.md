# @fimbul-works/observable

A lightweight, type-safe Observable library for TypeScript that provides reactive programming primitives with strong typing support.

[![npm version](https://badge.fury.io/js/%40fimbul-works%2Fobservable.svg)](https://www.npmjs.com/package/@fimbul-works/observable)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/microsoft/TypeScript)

## Features

- 🎯 Fully type-safe with TypeScript
- 🪶 Lightweight with zero dependencies
- 🏃‍♂️ High-performance implementation
- 🧩 Modular design with multiple observable patterns

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

### ObservableValue

A simple value container that notifies observers when the value changes.

```typescript
import { ObservableValue } from '@fimbul-works/observable';

const counter = new ObservableValue(0);

// Subscribe to changes
const unsubscribe = counter.onChange((value) => {
  console.log(`Counter changed to: ${value}`);
});

counter.set(1); // Logs: "Counter changed to: 1"

// Cleanup when done
unsubscribe();
```

### ObservableMap

A Map implementation that emits events when entries are added, updated, or removed.

```typescript
import { ObservableMap } from '@fimbul-works/observable';

const users = new ObservableMap<string, User>();

users.onChange((event) => {
  switch (event.type) {
    case 'add':
      console.log(`Added user: ${event.value.name}`);
      break;
    case 'update':
      console.log(`Updated user: ${event.value.name}`);
      break;
    case 'delete':
      console.log(`Deleted user: ${event.key}`);
      break;
  }
});

users.set('user1', { id: 1, name: 'Alice' });
```

### ObservableSet

A Set implementation that notifies observers of additions and removals.

```typescript
import { ObservableSet } from '@fimbul-works/observable';

const activeUsers = new ObservableSet<string>();

activeUsers.onChange((event) => {
  switch (event.type) {
    case 'add':
      console.log(`User became active: ${event.key}`);
      break;
    case 'delete':
      console.log(`User became inactive: ${event.key}`);
      break;
  }
});

activeUsers.add('alice');
```

### ObservableRegistry

A stricter version of ObservableMap that enforces unique registration and required existence.

```typescript
import { ObservableRegistry } from '@fimbul-works/observable';

const plugins = new ObservableRegistry<string, Plugin>();

// Will throw if 'logger' is already registered
plugins.register('logger', new LoggerPlugin());

// Will throw if 'unknown' is not registered
const logger = plugins.get('logger');
```

### EventEmitter

A strongly-typed event emitter for handling multiple event types.

```typescript
import { EventEmitter } from '@fimbul-works/observable';

const events = new EventEmitter<AppEvents>(['userLogin', 'error', 'notify']);

// Subscribe with cleanup function
const cleanup = events.on('userLogin', ({ userId, timestamp }) => {
  console.log(`User ${userId} logged in at ${timestamp}`);
});

const errorCleanup = events.onError('userLogin', (error) => {
  console.error('Error in login handler:', error);
});

events.emit('userLogin', { userId: 'alice', timestamp: Date.now() });

// Cleanup when done
cleanup();
errorCleanup();
```

### Signal

A low-level primitive for implementing publish/subscribe patterns with error handling.

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

signal.emit('Hello!');

// Cleanup when done
cleanup();
errorCleanup();
```

## API Documentation

### ObservableValue<T>

- `constructor(initial: T)`: Creates a new observable value
- `get(): T`: Returns the current value
- `set(newValue: T): void`: Updates the value and notifies observers
- `onChange(fn: (value: T) => void): () => void`: Subscribes to value changes

### ObservableMap<K, V>

- `set(key: K, value: V): this`: Sets a value for a key
- `get(key: K): V | undefined`: Gets a value by key
- `delete(key: K): boolean`: Removes a key-value pair
- `clear(): void`: Removes all entries
- `has(key: K): boolean`: Checks if a key exists
- `size: number`: Number of entries in the map
- `onChange(fn: (event: CollectionEvent<K, V>) => void): () => void`: Subscribes to changes

### ObservableSet<T>

- `add(value: T): this`: Adds a value to the set
- `delete(value: T): boolean`: Removes a value
- `has(value: T): boolean`: Checks if a value exists
- `clear(): void`: Removes all values
- `size(): number`: Number of values in the set
- `values(): IterableIterator<T>`: Returns an iterator of values
- `onChange(fn: (event: CollectionEvent<T, boolean>) => void): () => void`: Subscribes to changes

### ObservableRegistry<K, V>

Extends ObservableMap with:
- `register(key: K, value: V): this`: Registers a new key-value pair (throws if key exists)
- `unregister(key: K): boolean`: Removes a registration
- `get(key: K): V`: Gets a value (throws if key doesn't exist)

### EventEmitter<T extends EventMap>

- `on<K extends keyof T>(event: K, fn: (data: T[K]) => void): this`: Subscribes to an event
- `off<K extends keyof T>(event: K, fn: (data: T[K]) => void): this`: Unsubscribes from an event
- `emit<K extends keyof T>(event: K, data?: T[K]): this`: Emits an event
- `onError<K extends keyof T>(event: K, fn: (error: Error) => void): this`: Handles errors for an event
- `destroy(): void`: Cleans up all subscriptions

### Signal<T>

- `connect(fn: (data: T) => void): () => void`: Adds an event handler and returns cleanup function
- `once(fn: (data: T) => void): () => void`: Adds a one-time event handler and returns cleanup function
- `disconnect(fn?: (data: T) => void): void`: Removes specific handler or all handlers
- `emit(data: T): number`: Emits data to all handlers, returns number of handlers called
- `connectError(fn: (error: Error) => void): () => void`: Adds error handler and returns cleanup function
- `disconnectError(fn: (error: Error) => void): void`: Removes error handler
- `hasHandlers(): boolean`: Checks if there are any active handlers
- `listenerCount(): number`: Returns the total number of handlers

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

Built with ⚡ by [FimbulWorks](https://github.com/fimbul-works)
