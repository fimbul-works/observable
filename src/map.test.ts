import { ObservableMap } from "./map";

describe("ObservableMap", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let map: ObservableMap<string, number>;

  beforeEach(() => {
    map = new ObservableMap();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should create empty map when no entries provided", () => {
      expect(map.size).toBe(0);
    });

    it("should initialize with provided entries", () => {
      const initialMap = new ObservableMap([
        ["one", 1],
        ["two", 2],
      ]);
      expect(initialMap.size).toBe(2);
      expect(initialMap.get("one")).toBe(1);
      expect(initialMap.get("two")).toBe(2);
    });

    it("should handle different value types", () => {
      const mixedMap = new ObservableMap<string, unknown>([
        ["number", 42],
        ["string", "hello"],
        ["boolean", true],
        ["object", { foo: "bar" }],
        ["array", [1, 2, 3]],
        ["null", null],
        ["undefined", undefined],
      ]);

      expect(mixedMap.get("number")).toBe(42);
      expect(mixedMap.get("string")).toBe("hello");
      expect(mixedMap.get("boolean")).toBe(true);
      expect(mixedMap.get("object")).toEqual({ foo: "bar" });
      expect(mixedMap.get("array")).toEqual([1, 2, 3]);
      expect(mixedMap.get("null")).toBeNull();
      expect(mixedMap.get("undefined")).toBeUndefined();
    });
  });

  describe("basic operations", () => {
    describe("set", () => {
      it("should add a new key-value pair", () => {
        map.set("test", 42);
        expect(map.get("test")).toBe(42);
      });

      it("should emit add event for new entries", () => {
        const handler = jest.fn();
        map.onChange(handler);

        map.set("test", 42);

        expect(handler).toHaveBeenCalledWith({
          type: "add",
          key: "test",
          value: 42,
          oldValue: undefined,
        });
      });

      it("should emit update event for existing entries", () => {
        const handler = jest.fn();
        map.set("test", 42);
        map.onChange(handler);

        map.set("test", 100);

        expect(handler).toHaveBeenCalledWith({
          type: "update",
          key: "test",
          value: 100,
          oldValue: 42,
        });
      });

      it("should not emit event when setting same value", () => {
        const handler = jest.fn();
        map.set("test", 42);
        map.onChange(handler);

        map.set("test", 42);

        expect(handler).not.toHaveBeenCalled();
      });

      it("should support method chaining", () => {
        const result = map.set("test", 42);
        expect(result).toBe(map);
      });
    });

    describe("get", () => {
      it("should retrieve existing values", () => {
        map.set("test", 42);
        expect(map.get("test")).toBe(42);
      });

      it("should return undefined for non-existent keys", () => {
        expect(map.get("nonexistent")).toBeUndefined();
      });
    });

    describe("has", () => {
      it("should return true for existing keys", () => {
        map.set("test", 42);
        expect(map.has("test")).toBe(true);
      });

      it("should return false for non-existent keys", () => {
        expect(map.has("test")).toBe(false);
      });

      it("should handle undefined values correctly", () => {
        // biome-ignore lint/suspicious/noExplicitAny: testing
        map.set("test", undefined as any);
        expect(map.has("test")).toBe(true);
      });
    });

    describe("delete", () => {
      it("should remove existing entries", () => {
        map.set("test", 42);
        const result = map.delete("test");

        expect(result).toBe(true);
        expect(map.has("test")).toBe(false);
      });

      it("should emit delete event for existing entries", () => {
        const handler = jest.fn();
        map.set("test", 42);
        map.onChange(handler);

        map.delete("test");

        expect(handler).toHaveBeenCalledWith({
          type: "delete",
          key: "test",
          oldValue: 42,
        });
      });

      it("should return false for non-existent keys", () => {
        const result = map.delete("nonexistent");
        expect(result).toBe(false);
      });

      it("should not emit event for non-existent keys", () => {
        const handler = jest.fn();
        map.onChange(handler);

        map.delete("nonexistent");

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe("clear", () => {
      it("should remove all entries", () => {
        map.set("one", 1).set("two", 2);
        map.clear();

        expect(map.size).toBe(0);
        expect(map.has("one")).toBe(false);
        expect(map.has("two")).toBe(false);
      });

      it("should emit clear event", () => {
        const handler = jest.fn();
        map.set("test", 42);
        map.onChange(handler);

        map.clear();

        expect(handler).toHaveBeenCalledWith({
          type: "clear",
          key: null,
        });
      });

      it("should not emit clear event when map is empty", () => {
        const handler = jest.fn();
        map.onChange(handler);
        map.clear();
        expect(handler).not.toHaveBeenCalled();
      });
    });
  });

  describe("iteration", () => {
    beforeEach(() => {
      map.set("one", 1).set("two", 2).set("three", 3);
    });

    it("should support for...of iteration", () => {
      const entries: Array<[string, number]> = [];
      for (const [key, value] of map) {
        entries.push([key, value]);
      }
      expect(entries).toEqual([
        ["one", 1],
        ["two", 2],
        ["three", 3],
      ]);
    });

    it("should iterate over entries", () => {
      const entries = Array.from(map.entries());
      expect(entries).toEqual([
        ["one", 1],
        ["two", 2],
        ["three", 3],
      ]);
    });

    it("should iterate over keys", () => {
      const keys = Array.from(map.keys());
      expect(keys).toEqual(["one", "two", "three"]);
    });

    it("should iterate over values", () => {
      const values = Array.from(map.values());
      expect(values).toEqual([1, 2, 3]);
    });

    it("should execute forEach with correct arguments and context", () => {
      const context = { test: true };
      const spy = jest.fn();
      map.forEach(spy, context);

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenNthCalledWith(1, 1, "one", expect.any(Map));
      expect(spy).toHaveBeenNthCalledWith(2, 2, "two", expect.any(Map));
      expect(spy).toHaveBeenNthCalledWith(3, 3, "three", expect.any(Map));

      expect(spy.mock.instances[0]).toBe(context);
    });
  });

  describe("observer functionality", () => {
    it("should support multiple observers", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      map.onChange(handler1);
      map.onChange(handler2);
      map.set("test", 42);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should allow observer removal", () => {
      const handler = jest.fn();
      const unsubscribe = map.onChange(handler);

      map.set("first", 1);
      unsubscribe();
      map.set("second", 2);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should handle observer errors gracefully", () => {
      const errorHandler = jest.fn(() => {
        throw new Error("Observer error");
      });
      const normalHandler = jest.fn();

      map.onChange(errorHandler);
      map.onChange(normalHandler);

      map.set("test", 42);

      expect(normalHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should maintain observer order", () => {
      const order: number[] = [];
      map.onChange(() => order.push(1));
      map.onChange(() => order.push(2));
      map.onChange(() => order.push(3));

      map.set("test", 42);
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe("type safety", () => {
    it("should handle complex types", () => {
      interface User {
        id: number;
        name: string;
      }

      const userMap = new ObservableMap<string, User>();
      const handler = jest.fn();
      userMap.onChange(handler);

      userMap.set("user1", { id: 1, name: "Alice" });

      expect(handler).toHaveBeenCalledWith({
        type: "add",
        key: "user1",
        value: { id: 1, name: "Alice" },
        oldValue: undefined,
      });
    });

    it("should work with non-string keys", () => {
      const numericMap = new ObservableMap<number, string>();
      numericMap.set(1, "one");
      expect(numericMap.get(1)).toBe("one");

      const objectMap = new ObservableMap<{ id: number }, string>();
      const key = { id: 1 };
      objectMap.set(key, "test");
      expect(objectMap.get(key)).toBe("test");
    });

    it("should handle undefined values", () => {
      const map = new ObservableMap<string, string | undefined>();
      map.set("key", undefined);
      expect(map.has("key")).toBe(true);
      expect(map.get("key")).toBeUndefined();
    });
  });

  describe("async methods", () => {
    let map: ObservableMap<string, number>;

    beforeEach(() => {
      map = new ObservableMap<string, number>();
    });

    describe("setAsync", () => {
      it("should add a new key-value pair asynchronously", async () => {
        const result = await map.setAsync("test", 42);

        expect(map.get("test")).toBe(42);
        expect(result).toBe(map);
      });

      it("should emit add event and wait for handlers", async () => {
        const results: string[] = [];
        const handler = jest.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}: ${event.key}=${event.value}`);
        });

        map.onChange(handler);
        await map.setAsync("test", 42);

        expect(handler).toHaveBeenCalledWith({
          type: "add",
          key: "test",
          value: 42,
          oldValue: undefined,
        });
        expect(results).toEqual(["add: test=42"]);
      });

      it("should emit update event for existing entries", async () => {
        await map.setAsync("test", 42);

        const handler = jest.fn();
        map.onChange(handler);

        await map.setAsync("test", 100);

        expect(handler).toHaveBeenCalledWith({
          type: "update",
          key: "test",
          value: 100,
          oldValue: 42,
        });
      });

      it("should not emit event when setting same value", async () => {
        await map.setAsync("test", 42);

        const handler = jest.fn();
        map.onChange(handler);

        await map.setAsync("test", 42);

        expect(handler).not.toHaveBeenCalled();
      });

      it("should wait for all async handlers", async () => {
        const results: string[] = [];

        const slowHandler1 = jest.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          results.push(`first: ${event.type}`);
        });

        const slowHandler2 = jest.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`second: ${event.type}`);
        });

        map.onChange(slowHandler1);
        map.onChange(slowHandler2);

        await map.setAsync("test", 42);

        expect(results.length).toBe(2);
        expect(results).toContain("first: add");
        expect(results).toContain("second: add");
      });
    });

    describe("deleteAsync", () => {
      it("should remove existing entries asynchronously", async () => {
        await map.setAsync("test", 42);
        const result = await map.deleteAsync("test");

        expect(result).toBe(true);
        expect(map.has("test")).toBe(false);
      });

      it("should emit delete event and wait for handlers", async () => {
        await map.setAsync("test", 42);

        const results: string[] = [];
        const handler = jest.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}: ${event.key}`);
        });

        map.onChange(handler);
        await map.deleteAsync("test");

        expect(handler).toHaveBeenCalledWith({
          type: "delete",
          key: "test",
          oldValue: 42,
        });
        expect(results).toEqual(["delete: test"]);
      });

      it("should return false for non-existent keys", async () => {
        const result = await map.deleteAsync("nonexistent");
        expect(result).toBe(false);
      });

      it("should not emit event for non-existent keys", async () => {
        const handler = jest.fn();
        map.onChange(handler);

        await map.deleteAsync("nonexistent");

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe("clearAsync", () => {
      it("should remove all entries asynchronously", async () => {
        await map.setAsync("one", 1);
        await map.setAsync("two", 2);

        await map.clearAsync();

        expect(map.size).toBe(0);
        expect(map.has("one")).toBe(false);
        expect(map.has("two")).toBe(false);
      });

      it("should emit clear event and wait for handlers", async () => {
        await map.setAsync("test", 42);

        const results: string[] = [];
        const handler = jest.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}`);
        });

        map.onChange(handler);
        await map.clearAsync();

        expect(handler).toHaveBeenCalledWith({
          type: "clear",
          key: null,
        });
        expect(results).toEqual(["clear"]);
      });

      it("should not emit clear event when map is empty", async () => {
        const handler = jest.fn();
        map.onChange(handler);

        await map.clearAsync();

        expect(handler).not.toHaveBeenCalled();
      });

      it("should handle errors in async handlers", async () => {
        await map.setAsync("test", 42);

        const errorHandler = jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Async handler error");
        });

        const normalHandler = jest.fn();
        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation();

        map.onChange(errorHandler);
        map.onChange(normalHandler);

        await map.clearAsync();

        expect(normalHandler).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

        consoleErrorSpy.mockRestore();
      });
    });

    describe("async operation chaining", () => {
      it("should support chaining multiple async operations", async () => {
        const handler = jest.fn();
        map.onChange(handler);

        // Chain multiple async operations
        await map
          .setAsync("one", 1)
          .then(() => map.setAsync("two", 2))
          .then(() => map.deleteAsync("one"));

        expect(map.has("one")).toBe(false);
        expect(map.has("two")).toBe(true);
        expect(handler).toHaveBeenCalledTimes(3);
      });
    });
  });
});
