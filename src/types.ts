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
 * Generic event handler function type.
 * @template T The type of data passed to the handler (defaults to unknown)
 * @param data The event data
 * @returns A Promise that resolves to void, or void
 */
export type EventHandler<T = unknown> = (data: T) => Promise<void> | void;

/**
 * Error handler function type.
 * @template T The error type (must extend Error, defaults to Error)
 * @param error The error object to handle
 * @returns A Promise that resolves to void, or void
 */
export type ErrorHandler<T = Error> = (error: T) => Promise<void> | void;
