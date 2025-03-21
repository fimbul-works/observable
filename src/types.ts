/**
 * Events that can occur on a collection
 */
export type CollectionEvent<K, V> = {
  type: "add" | "update" | "delete" | "clear";
  key: K;
  value?: V;
  oldValue?: V;
};

/**
 * Base interface for all observable types
 */
export interface Observable<T> {
  onChange(handler: EventHandler<T>): void;
}

/**
 * Type for event handlers that can be synchronous or asynchronous
 * @template T The data type for the event
 * @template R The return type (void for sync, Promise<void> for async, or any other return type)
 */
export type EventHandler<T = unknown, R = void> = (data: T) => R;

/**
 * Error handler function type.
 * @template T The error type (must extend Error, defaults to Error)
 * @param error The error object to handle
 * @returns A Promise that resolves to void, or void
 */
export type ErrorHandler<T = Error> = (error: T) => Promise<void> | void;
