import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObservableSet } from "./set.js";

describe("ObservableSet", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let set: ObservableSet<string>;

  beforeEach(() => {
    set = new ObservableSet();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should create empty set when no values provided", () => {
      expect(set.size).toBe(0);
    });

    it("should initialize with provided values", () => {
      const initialSet = new ObservableSet(["one", "two", "three"]);
      expect(initialSet.size).toBe(3);
      expect(initialSet.has("one")).toBe(true);
      expect(initialSet.has("two")).toBe(true);
      expect(initialSet.has("three")).toBe(true);
    });

    it("should handle different types of values", () => {
      const mixedSet = new ObservableSet([1, "two", true, { id: 1 }]);
      expect(mixedSet.size).toBe(4);
      expect(mixedSet.has(1)).toBe(true);
      expect(mixedSet.has("two")).toBe(true);
      expect(mixedSet.has(true)).toBe(true);
      expect(mixedSet.has({ id: 1 })).toBe(false); // Objects compare by reference
    });

    it("should deduplicate initial values", () => {
      const setWithDupes = new ObservableSet(["one", "one", "two", "two"]);
      expect(setWithDupes.size).toBe(2);
      expect(Array.from(setWithDupes)).toEqual(["one", "two"]);
    });
  });

  describe("basic operations", () => {
    describe("add", () => {
      it("should add a new value", () => {
        set.add("test");
        expect(set.has("test")).toBe(true);
      });

      it("should emit an event when adding a new value", () => {
        const handler = vi.fn();
        set.onChange(handler);

        set.add("test");

        expect(handler).toHaveBeenCalledWith({
          type: "add",
          key: "test",
          value: true,
        });
      });

      it("should not emit an event when adding an existing value", () => {
        const handler = vi.fn();
        set.add("test");
        set.onChange(handler);

        set.add("test");

        expect(handler).not.toHaveBeenCalled();
      });

      it("should return the set instance for chaining", () => {
        const result = set.add("test");
        expect(result).toBe(set);
      });
    });

    describe("delete", () => {
      it("should remove an existing value", () => {
        set.add("test");
        const result = set.delete("test");

        expect(result).toBe(true);
        expect(set.has("test")).toBe(false);
      });

      it("should emit an event when deleting an existing value", () => {
        const handler = vi.fn();
        set.add("test");
        set.onChange(handler);

        set.delete("test");

        expect(handler).toHaveBeenCalledWith({
          type: "delete",
          key: "test",
          oldValue: true,
        });
      });

      it("should return false when deleting a non-existent value", () => {
        const result = set.delete("nonexistent");
        expect(result).toBe(false);
      });

      it("should not emit an event when deleting a non-existent value", () => {
        const handler = vi.fn();
        set.onChange(handler);

        set.delete("nonexistent");

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe("clear", () => {
      it("should remove all values", () => {
        set.add("one").add("two");
        set.clear();

        expect(set.has("one")).toBe(false);
        expect(set.has("two")).toBe(false);
        expect(set.size).toBe(0);
      });

      it("should emit a clear event", () => {
        const handler = vi.fn();
        set.add("test");
        set.onChange(handler);

        set.clear();

        expect(handler).toHaveBeenCalledWith({
          type: "clear",
          key: null,
        });
      });

      it("should not emit clear event on empty set", () => {
        const handler = vi.fn();
        set.onChange(handler);
        set.clear();
        expect(handler).not.toHaveBeenCalled();
      });
    });
  });

  describe("set operations", () => {
    describe("union", () => {
      it("should combine two sets", () => {
        const set1 = new ObservableSet(["a", "b"]);
        const set2 = new ObservableSet(["b", "c"]);

        const union = set1.union(set2);
        expect(Array.from(union)).toEqual(["a", "b", "c"]);
      });

      it("should work with regular Set", () => {
        const obsSet = new ObservableSet(["a", "b"]);
        const regularSet = new Set(["b", "c"]);

        const union = obsSet.union(regularSet);
        expect(Array.from(union)).toEqual(["a", "b", "c"]);
      });
    });

    describe("intersection", () => {
      it("should return common elements", () => {
        const set1 = new ObservableSet(["a", "b", "c"]);
        const set2 = new ObservableSet(["b", "c", "d"]);

        const intersection = set1.intersection(set2);
        expect(Array.from(intersection)).toEqual(["b", "c"]);
      });

      it("should return empty set when no common elements", () => {
        const set1 = new ObservableSet(["a", "b"]);
        const set2 = new ObservableSet(["c", "d"]);

        const intersection = set1.intersection(set2);
        expect(intersection.size).toBe(0);
      });
    });

    describe("difference", () => {
      it("should return elements only in first set", () => {
        const set1 = new ObservableSet(["a", "b", "c"]);
        const set2 = new ObservableSet(["b", "c", "d"]);

        const difference = set1.difference(set2);
        expect(Array.from(difference)).toEqual(["a"]);
      });

      it("should return all elements when no common elements", () => {
        const set1 = new ObservableSet(["a", "b"]);
        const set2 = new ObservableSet(["c", "d"]);

        const difference = set1.difference(set2);
        expect(Array.from(difference)).toEqual(["a", "b"]);
      });
    });

    describe("symmetricDifference", () => {
      it("should return elements in either set but not both", () => {
        const set1 = new ObservableSet(["a", "b", "c"]);
        const set2 = new ObservableSet(["b", "c", "d"]);

        const symDifference = set1.symmetricDifference(set2);
        expect(Array.from(symDifference)).toEqual(["a", "d"]);
      });
    });
  });

  describe("set predicates", () => {
    describe("isSubsetOf", () => {
      it("should return true when all elements are in other set", () => {
        const subset = new ObservableSet(["a", "b"]);
        const superset = new ObservableSet(["a", "b", "c"]);

        expect(subset.isSubsetOf(superset)).toBe(true);
      });

      it("should return false when some elements are missing", () => {
        const set1 = new ObservableSet(["a", "b", "c"]);
        const set2 = new ObservableSet(["a", "b"]);

        expect(set1.isSubsetOf(set2)).toBe(false);
      });
    });

    describe("isSupersetOf", () => {
      it("should return true when containing all elements of other set", () => {
        const superset = new ObservableSet(["a", "b", "c"]);
        const subset = new ObservableSet(["a", "b"]);

        expect(superset.isSupersetOf(subset)).toBe(true);
      });
    });

    describe("isDisjointFrom", () => {
      it("should return true when sets have no common elements", () => {
        const set1 = new ObservableSet(["a", "b"]);
        const set2 = new ObservableSet(["c", "d"]);

        expect(set1.isDisjointFrom(set2)).toBe(true);
      });

      it("should return false when sets have common elements", () => {
        const set1 = new ObservableSet(["a", "b"]);
        const set2 = new ObservableSet(["b", "c"]);

        expect(set1.isDisjointFrom(set2)).toBe(false);
      });
    });
  });

  describe("iteration and functional methods", () => {
    describe("forEach", () => {
      it("should iterate over all values", () => {
        const values = ["one", "two", "three"];
        const testSet = new ObservableSet(values);
        const seen = new Set();

        for (const value of testSet) {
          seen.add(value);
        }

        expect(Array.from(seen)).toEqual(values);
      });

      it("should provide correct arguments to callback", () => {
        const spy = vi.fn();
        const testSet = new ObservableSet(["test"]);

        testSet.forEach(spy);
        expect(spy).toHaveBeenCalledWith("test", "test", expect.any(Set));
      });
    });

    describe("map", () => {
      it("should transform elements", () => {
        const original = new ObservableSet([1, 2, 3]);
        const doubled = original.map((x) => x * 2);

        expect(Array.from(doubled)).toEqual([2, 4, 6]);
      });

      it("should handle type transformations", () => {
        const numbers = new ObservableSet([1, 2, 3]);
        const strings = numbers.map((x) => x.toString());

        expect(Array.from(strings)).toEqual(["1", "2", "3"]);
      });
    });

    describe("filter", () => {
      it("should keep elements matching predicate", () => {
        const numbers = new ObservableSet([1, 2, 3, 4]);
        const evens = numbers.filter((x) => x % 2 === 0);

        expect(Array.from(evens)).toEqual([2, 4]);
      });
    });

    describe("toArray", () => {
      it("should convert set to array", () => {
        set.add("one").add("two");
        expect(set.toArray()).toEqual(["one", "two"]);
      });
    });

    describe("toJSON", () => {
      it("should serialize to array", () => {
        set.add("one").add("two");
        expect(set.toJSON()).toEqual(["one", "two"]);
      });
    });
  });

  describe("error handling", () => {
    it("should handle errors in observers gracefully", () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Observer error");
      });
      const normalHandler = vi.fn();

      set.onChange(errorHandler);
      set.onChange(normalHandler);

      set.add("test");

      expect(normalHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("async methods", () => {
    let set: ObservableSet<string>;

    beforeEach(() => {
      set = new ObservableSet<string>();
    });

    describe("addAsync", () => {
      it("should add a new value asynchronously", async () => {
        const result = await set.addAsync("test");

        expect(set.has("test")).toBe(true);
        expect(result).toBe(set);
      });

      it("should emit add event and wait for handlers", async () => {
        const results: string[] = [];
        const handler = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}: ${event.key}`);
        });

        set.onChange(handler);
        await set.addAsync("test");

        expect(handler).toHaveBeenCalledWith({
          type: "add",
          key: "test",
          value: true,
        });
        expect(results).toEqual(["add: test"]);
      });

      it("should not emit event when adding existing value", async () => {
        await set.addAsync("test");

        const handler = vi.fn();
        set.onChange(handler);

        await set.addAsync("test");

        expect(handler).not.toHaveBeenCalled();
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

        set.onChange(slowHandler1);
        set.onChange(slowHandler2);

        await set.addAsync("test");

        expect(results.length).toBe(2);
        expect(results).toContain("first: add");
        expect(results).toContain("second: add");
      });
    });

    describe("deleteAsync", () => {
      it("should remove existing values asynchronously", async () => {
        await set.addAsync("test");
        const result = await set.deleteAsync("test");

        expect(result).toBe(true);
        expect(set.has("test")).toBe(false);
      });

      it("should emit delete event and wait for handlers", async () => {
        await set.addAsync("test");

        const results: string[] = [];
        const handler = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}: ${event.key}`);
        });

        set.onChange(handler);
        await set.deleteAsync("test");

        expect(handler).toHaveBeenCalledWith({
          type: "delete",
          key: "test",
          oldValue: true,
        });
        expect(results).toEqual(["delete: test"]);
      });

      it("should return false for non-existent values", async () => {
        const result = await set.deleteAsync("nonexistent");
        expect(result).toBe(false);
      });

      it("should not emit event for non-existent values", async () => {
        const handler = vi.fn();
        set.onChange(handler);

        await set.deleteAsync("nonexistent");

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe("clearAsync", () => {
      it("should remove all values asynchronously", async () => {
        await set.addAsync("one");
        await set.addAsync("two");

        await set.clearAsync();

        expect(set.size).toBe(0);
        expect(set.has("one")).toBe(false);
        expect(set.has("two")).toBe(false);
      });

      it("should emit clear event and wait for handlers", async () => {
        await set.addAsync("test");

        const results: string[] = [];
        const handler = vi.fn().mockImplementation(async (event) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(`${event.type}`);
        });

        set.onChange(handler);
        await set.clearAsync();

        expect(handler).toHaveBeenCalledWith({
          type: "clear",
          key: null,
        });
        expect(results).toEqual(["clear"]);
      });

      it("should not emit clear event when set is empty", async () => {
        const handler = vi.fn();
        set.onChange(handler);

        await set.clearAsync();

        expect(handler).not.toHaveBeenCalled();
      });

      it("should handle errors in async handlers", async () => {
        await set.addAsync("test");

        const errorHandler = vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Async handler error");
        });

        const normalHandler = vi.fn();
        const consoleErrorSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});

        set.onChange(errorHandler);
        set.onChange(normalHandler);

        await set.clearAsync();

        expect(normalHandler).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

        consoleErrorSpy.mockRestore();
      });
    });

    describe("async operation chaining", () => {
      it("should support chaining multiple async operations", async () => {
        const handler = vi.fn();
        set.onChange(handler);

        // Chain multiple async operations
        await set
          .addAsync("one")
          .then(() => set.addAsync("two"))
          .then(() => set.deleteAsync("one"));

        expect(set.has("one")).toBe(false);
        expect(set.has("two")).toBe(true);
        expect(handler).toHaveBeenCalledTimes(3);
      });
    });

    describe("async set operations", () => {
      it("should handle async operations with set combinations", async () => {
        const set1 = new ObservableSet(["a", "b"]);
        const set2 = new ObservableSet(["b", "c"]);

        const handler1 = vi.fn();
        const handler2 = vi.fn();

        set1.onChange(handler1);
        set2.onChange(handler2);

        // Perform operations on both sets asynchronously
        await Promise.all([set1.addAsync("d"), set2.addAsync("d")]);

        // Check union operation
        const union = set1.union(set2);
        expect(Array.from(union)).toEqual(["a", "b", "d", "c"]);

        // Check intersection operation
        const intersection = set1.intersection(set2);
        expect(Array.from(intersection)).toEqual(["b", "d"]);

        // Verify handlers were called correctly
        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
      });
    });
  });
});
