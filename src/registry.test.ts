import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObservableRegistry } from "./registry.js";

describe("ObservableRegistry", () => {
  let registry: ObservableRegistry<string, number>;

  beforeEach(() => {
    registry = new ObservableRegistry();
  });

  describe("register", () => {
    it("should register a new key-value pair", () => {
      registry.register("test", 123);
      expect(registry.get("test")).toBe(123);
    });

    it("should throw when registering an existing key", () => {
      registry.register("test", 123);
      expect(() => registry.register("test", 456)).toThrow(
        "Already registered: test",
      );
    });

    it("should return the registry instance for chaining", () => {
      const result = registry.register("test", 123);
      expect(result).toBe(registry);
    });

    it("should emit an add event", () => {
      const handler = vi.fn();
      registry.onChange(handler);

      registry.register("test", 123);

      expect(handler).toHaveBeenCalledWith({
        type: "add",
        key: "test",
        value: 123,
        oldValue: undefined,
      });
    });
  });

  describe("unregister", () => {
    it("should remove a registered value", () => {
      registry.register("test", 123);
      const result = registry.unregister("test");

      expect(result).toBe(true);
      expect(() => registry.get("test")).toThrow("Not registered: test");
    });

    it("should return false when unregistering a non-existent key", () => {
      const result = registry.unregister("nonexistent");
      expect(result).toBe(false);
    });

    it("should emit a delete event", () => {
      const handler = vi.fn();
      registry.register("test", 123);
      registry.onChange(handler);

      registry.unregister("test");

      expect(handler).toHaveBeenCalledWith({
        type: "delete",
        key: "test",
        oldValue: 123,
      });
    });

    it("should not emit an event when key does not exist", () => {
      const handler = vi.fn();
      registry.onChange(handler);

      registry.unregister("nonexistent");

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("should return a registered value", () => {
      registry.register("test", 123);
      expect(registry.get("test")).toBe(123);
    });

    it("should throw when getting a non-existent key", () => {
      expect(() => registry.get("nonexistent")).toThrow(
        "Not registered: nonexistent",
      );
    });
  });

  describe("inherited ObservableMap methods", () => {
    it("should support has() method", () => {
      registry.register("test", 123);
      expect(registry.has("test")).toBe(true);
      expect(registry.has("nonexistent")).toBe(false);
    });

    it("should support values() iteration", () => {
      registry.register("one", 1);
      registry.register("two", 2);

      const values = Array.from(registry.values());
      expect(values).toEqual([1, 2]);
    });

    it("should support keys() iteration", () => {
      registry.register("one", 1);
      registry.register("two", 2);

      const keys = Array.from(registry.keys());
      expect(keys).toEqual(["one", "two"]);
    });

    it("should support entries() iteration", () => {
      registry.register("one", 1);
      registry.register("two", 2);

      const entries = Array.from(registry.entries());
      expect(entries).toEqual([
        ["one", 1],
        ["two", 2],
      ]);
    });

    it("should support clear() operation", () => {
      registry.register("one", 1);
      registry.register("two", 2);

      const handler = vi.fn();
      registry.onChange(handler);

      registry.clear();

      expect(() => registry.get("one")).toThrow("Not registered: one");
      expect(() => registry.get("two")).toThrow("Not registered: two");
      expect(handler).toHaveBeenCalledWith({
        type: "clear",
        key: null,
      });
    });
  });

  describe("observer functionality", () => {
    it("should allow multiple observers", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registry.onChange(handler1);
      registry.onChange(handler2);

      registry.register("test", 123);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it("should allow observer removal", () => {
      const handler = vi.fn();
      const unsubscribe = registry.onChange(handler);

      registry.register("test", 123);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      registry.register("another", 456);
      expect(handler).toHaveBeenCalledTimes(1); // Still just once
    });
  });

  describe("ObservableRegistry async methods", () => {
    let registry: ObservableRegistry<string, number>;

    beforeEach(() => {
      registry = new ObservableRegistry<string, number>();
    });

    describe("registerAsync", () => {
      it("should register a new key-value pair asynchronously", async () => {
        const result = await registry.registerAsync("test", 123);

        expect(registry.get("test")).toBe(123);
        expect(result).toBe(registry);
      });

      it("should emit add event and wait for handlers", async () => {
        const results: string[] = [];
        const handler = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}: ${event.key}=${event.value}`);
        });

        registry.onChange(handler);
        await registry.registerAsync("test", 123);

        expect(handler).toHaveBeenCalledWith({
          type: "add",
          key: "test",
          value: 123,
          oldValue: undefined,
        });
        expect(results).toEqual(["add: test=123"]);
      });

      it("should throw when registering an existing key", async () => {
        await registry.registerAsync("test", 123);

        await expect(registry.registerAsync("test", 456)).rejects.toThrow(
          "Already registered: test",
        );
      });

      it("should wait for all async handlers", async () => {
        const results: string[] = [];

        const slowHandler1 = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          results.push(`first: ${event.type}`);
        });

        const slowHandler2 = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`second: ${event.type}`);
        });

        registry.onChange(slowHandler1);
        registry.onChange(slowHandler2);

        await registry.registerAsync("test", 123);

        expect(results.length).toBe(2);
        expect(results).toContain("first: add");
        expect(results).toContain("second: add");
      });
    });

    describe("unregisterAsync", () => {
      it("should remove a registered value asynchronously", async () => {
        await registry.registerAsync("test", 123);
        const result = await registry.unregisterAsync("test");

        expect(result).toBe(true);
        expect(() => registry.get("test")).toThrow("Not registered: test");
      });

      it("should emit delete event and wait for handlers", async () => {
        await registry.registerAsync("test", 123);

        const results: string[] = [];
        const handler = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}: ${event.key}`);
        });

        registry.onChange(handler);
        await registry.unregisterAsync("test");

        expect(handler).toHaveBeenCalledWith({
          type: "delete",
          key: "test",
          oldValue: 123,
        });
        expect(results).toEqual(["delete: test"]);
      });

      it("should return false when unregistering a non-existent key", async () => {
        const result = await registry.unregisterAsync("nonexistent");
        expect(result).toBe(false);
      });

      it("should not emit an event when key does not exist", async () => {
        const handler = vi.fn();
        registry.onChange(handler);

        await registry.unregisterAsync("nonexistent");

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe("updateAsync", () => {
      it("should update a registered value asynchronously", async () => {
        await registry.registerAsync("test", 123);
        const result = await registry.updateAsync("test", 456);

        expect(registry.get("test")).toBe(456);
        expect(result).toBe(registry);
      });

      it("should emit update event and wait for handlers", async () => {
        await registry.registerAsync("test", 123);

        const results: string[] = [];
        const handler = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}: ${event.key}=${event.value}`);
        });

        registry.onChange(handler);
        await registry.updateAsync("test", 456);

        expect(handler).toHaveBeenCalledWith({
          type: "update",
          key: "test",
          value: 456,
          oldValue: 123,
        });
        expect(results).toEqual(["update: test=456"]);
      });

      it("should throw when updating a non-existent key", async () => {
        await expect(registry.updateAsync("nonexistent", 456)).rejects.toThrow(
          "Cannot update: nonexistent is not registered",
        );
      });
    });

    describe("updateWithAsync", () => {
      it("should update a registered value using transform function asynchronously", async () => {
        await registry.registerAsync("test", 10);
        const result = await registry.updateWithAsync(
          "test",
          (value) => value * 2,
        );

        expect(registry.get("test")).toBe(20);
        expect(result).toBe(registry);
      });

      it("should emit update event and wait for handlers", async () => {
        await registry.registerAsync("test", 10);

        const results: string[] = [];
        const handler = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}: ${event.key}=${event.value}`);
        });

        registry.onChange(handler);
        await registry.updateWithAsync("test", (value) => value * 2);

        expect(handler).toHaveBeenCalledWith({
          type: "update",
          key: "test",
          value: 20,
          oldValue: 10,
        });
        expect(results).toEqual(["update: test=20"]);
      });

      it("should throw when updating a non-existent key", async () => {
        await expect(
          registry.updateWithAsync("nonexistent", (value) => value * 2),
        ).rejects.toThrow("Not registered: nonexistent");
      });

      it("should handle errors in transform function", async () => {
        await registry.registerAsync("test", 10);

        await expect(
          registry.updateWithAsync("test", () => {
            throw new Error("Transform error");
          }),
        ).rejects.toThrow("Transform error");

        // Value should remain unchanged
        expect(registry.get("test")).toBe(10);
      });
    });

    describe("clearAsync", () => {
      it("should remove all entries asynchronously", async () => {
        await registry.registerAsync("one", 1);
        await registry.registerAsync("two", 2);

        await registry.clearAsync();

        expect(registry.size).toBe(0);
        expect(() => registry.get("one")).toThrow("Not registered: one");
        expect(() => registry.get("two")).toThrow("Not registered: two");
      });

      it("should emit clear event and wait for handlers", async () => {
        await registry.registerAsync("test", 123);

        const results: string[] = [];
        const handler = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}`);
        });

        registry.onChange(handler);
        await registry.clearAsync();

        expect(handler).toHaveBeenCalledWith({
          type: "clear",
          key: null,
        });
        expect(results).toEqual(["clear"]);
      });
    });

    describe("async operation chaining", () => {
      it("should support chaining multiple async operations", async () => {
        const handler = vi.fn();
        registry.onChange(handler);

        // Chain multiple async operations
        await registry
          .registerAsync("one", 1)
          .then(() => registry.registerAsync("two", 2))
          .then(() => registry.updateAsync("one", 100))
          .then(() => registry.unregisterAsync("two"));

        expect(registry.get("one")).toBe(100);
        expect(() => registry.get("two")).toThrow("Not registered: two");
        expect(handler).toHaveBeenCalledTimes(4);
      });
    });

    describe("error handling", () => {
      it("should handle errors in async handlers", async () => {
        const errorHandler = vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Async handler error");
        });

        const normalHandler = vi.fn();
        const consoleErrorSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});

        registry.onChange(errorHandler);
        registry.onChange(normalHandler);

        await registry.registerAsync("test", 123);

        expect(normalHandler).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

        consoleErrorSpy.mockRestore();
      });

      it("should propagate errors from validation checks", async () => {
        await registry.registerAsync("test", 123);

        // Should reject with the appropriate error
        await expect(registry.registerAsync("test", 456)).rejects.toThrow(
          "Already registered: test",
        );
        await expect(registry.updateAsync("nonexistent", 456)).rejects.toThrow(
          "Cannot update: nonexistent is not registered",
        );
        await expect(
          registry.updateWithAsync("nonexistent", (v) => v * 2),
        ).rejects.toThrow("Not registered: nonexistent");
      });
    });

    describe("inherited async methods", () => {
      it("should inherit setAsync from ObservableMap", async () => {
        const handler = vi.fn();
        registry.onChange(handler);

        // Using the inherited setAsync method (which bypasses registration check)
        await registry.setAsync("test", 123);

        expect(registry.get("test")).toBe(123);
        expect(handler).toHaveBeenCalledWith({
          type: "add",
          key: "test",
          value: 123,
          oldValue: undefined,
        });
      });
    });
  });
});
