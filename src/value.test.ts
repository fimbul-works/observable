import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObservableValue } from "./value.js";

describe("ObservableValue", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should initialize with the provided value", () => {
      const observable = new ObservableValue(42);
      expect(observable.get()).toBe(42);
    });

    it("should handle different types of values", () => {
      const numberObs = new ObservableValue(123);
      const stringObs = new ObservableValue("test");
      const boolObs = new ObservableValue(true);
      const objObs = new ObservableValue({ foo: "bar" });
      const arrayObs = new ObservableValue([1, 2, 3]);

      expect(numberObs.get()).toBe(123);
      expect(stringObs.get()).toBe("test");
      expect(boolObs.get()).toBe(true);
      expect(objObs.get()).toEqual({ foo: "bar" });
      expect(arrayObs.get()).toEqual([1, 2, 3]);
    });

    it("should handle null and undefined", () => {
      const nullObs = new ObservableValue(null);
      const undefinedObs = new ObservableValue(undefined);

      expect(nullObs.get()).toBeNull();
      expect(undefinedObs.get()).toBeUndefined();
    });
  });

  describe("get/set", () => {
    it("should return the current value", () => {
      const observable = new ObservableValue("test");
      expect(observable.get()).toBe("test");
    });

    it("should update and return the latest value", () => {
      const observable = new ObservableValue("initial");
      observable.set("updated");
      expect(observable.get()).toBe("updated");
    });

    it("should not notify observers when setting the same value", () => {
      const observable = new ObservableValue("test");
      const handler = vi.fn();

      observable.onChange(handler);
      observable.set("test");

      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle Object.is edge cases", () => {
      const observable = new ObservableValue(0);
      const handler = vi.fn();
      observable.onChange(handler);

      // -0 and +0 are different in Object.is
      observable.set(-0);
      expect(handler).toHaveBeenCalledTimes(1);

      // NaN is equal to itself in Object.is
      const nanObservable = new ObservableValue(Number.NaN);
      const nanHandler = vi.fn();
      nanObservable.onChange(nanHandler);
      nanObservable.set(Number.NaN);
      expect(nanHandler).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update value using transform function", () => {
      const observable = new ObservableValue(5);
      observable.update((val) => val * 2);
      expect(observable.get()).toBe(10);
    });

    it("should notify observers only once", () => {
      const observable = new ObservableValue(1);
      const handler = vi.fn();
      observable.onChange(handler);

      observable.update((val) => val + 1);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(2);
    });

    it("should not notify if transform returns same value", () => {
      const observable = new ObservableValue(42);
      const handler = vi.fn();
      observable.onChange(handler);

      observable.update((val) => val);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle errors in transform function", () => {
      const observable = new ObservableValue(1);
      const handler = vi.fn();
      observable.onChange(handler);

      expect(() =>
        observable.update(() => {
          throw new Error("transform error");
        }),
      ).toThrow("transform error");

      expect(observable.get()).toBe(1); // Value should remain unchanged
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("should immediately call subscriber with current value", () => {
      const observable = new ObservableValue("initial");
      const handler = vi.fn();

      observable.subscribe(handler);
      expect(handler).toHaveBeenCalledWith("initial");
    });

    it("should notify subscriber of subsequent changes", () => {
      const observable = new ObservableValue("initial");
      const handler = vi.fn();

      observable.subscribe(handler);
      observable.set("updated");

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, "initial");
      expect(handler).toHaveBeenNthCalledWith(2, "updated");
    });

    it("should return working unsubscribe function", () => {
      const observable = new ObservableValue("test");
      const handler = vi.fn();

      const unsubscribe = observable.subscribe(handler);
      expect(handler).toHaveBeenCalledWith("test");

      unsubscribe();
      observable.set("updated");
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("map", () => {
    it("should create derived observable with transformed values", () => {
      const observable = new ObservableValue(5);
      const derived = observable.map((x) => x * 2);

      expect(derived.get()).toBe(10);

      observable.set(10);
      expect(derived.get()).toBe(20);
    });

    it("should handle type transformations", () => {
      const observable = new ObservableValue(42);
      const derived = observable.map((x) => x.toString());

      expect(derived.get()).toBe("42");

      observable.set(100);
      expect(derived.get()).toBe("100");
    });

    it("should propagate updates to multiple derived observables", () => {
      const observable = new ObservableValue(1);
      const doubled = observable.map((x) => x * 2);
      const squared = observable.map((x) => x * x);
      const doubledHandler = vi.fn();
      const squaredHandler = vi.fn();

      doubled.onChange(doubledHandler);
      squared.onChange(squaredHandler);

      observable.set(3);

      expect(doubled.get()).toBe(6);
      expect(squared.get()).toBe(9);
      expect(doubledHandler).toHaveBeenCalledWith(6);
      expect(squaredHandler).toHaveBeenCalledWith(9);
    });
  });

  describe("observer management", () => {
    it("should report correct observer count", () => {
      const observable = new ObservableValue("test");
      expect(observable.observerCount()).toBe(0);

      const unsub1 = observable.onChange(() => {});
      expect(observable.observerCount()).toBe(1);

      const unsub2 = observable.onChange(() => {});
      expect(observable.observerCount()).toBe(2);

      unsub1();
      expect(observable.observerCount()).toBe(1);

      unsub2();
      expect(observable.observerCount()).toBe(0);
    });

    it("should correctly report if has observers", () => {
      const observable = new ObservableValue("test");
      expect(observable.hasObservers()).toBe(false);

      const unsubscribe = observable.onChange(() => {});
      expect(observable.hasObservers()).toBe(true);

      unsubscribe();
      expect(observable.hasObservers()).toBe(false);
    });

    it("should handle errors in observers gracefully", () => {
      const observable = new ObservableValue("test");
      const errorHandler = vi.fn(() => {
        throw new Error("Observer error");
      });
      const normalHandler = vi.fn();

      observable.onChange(errorHandler);
      observable.onChange(normalHandler);

      observable.set("new value");

      expect(normalHandler).toHaveBeenCalledWith("new value");
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("async methods", () => {
    let observable: ObservableValue<number>;

    beforeEach(() => {
      observable = new ObservableValue(10);
    });

    describe("setAsync", () => {
      it("should update value and notify observers asynchronously", async () => {
        const handler = vi.fn();
        observable.onChange(handler);

        await observable.setAsync(20);

        expect(observable.get()).toBe(20);
        expect(handler).toHaveBeenCalledWith(20);
      });

      it("should not notify when setting the same value", async () => {
        const handler = vi.fn();
        observable.onChange(handler);

        await observable.setAsync(10);

        expect(observable.get()).toBe(10);
        expect(handler).not.toHaveBeenCalled();
      });

      it("should wait for async handlers to complete", async () => {
        const results: number[] = [];
        const slowHandler = vi
          .fn()
          .mockImplementation(async (value: number) => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            results.push(value);
          });

        observable.onChange(slowHandler);
        await observable.setAsync(20);

        expect(results).toEqual([20]);
      });

      it("should handle errors in async handlers", async () => {
        const errorHandler = vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Async handler error");
        });
        const normalHandler = vi.fn();

        const consoleErrorSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {});

        observable.onChange(errorHandler);
        observable.onChange(normalHandler);

        await observable.setAsync(20);

        expect(normalHandler).toHaveBeenCalledWith(20);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

        consoleErrorSpy.mockRestore();
      });
    });

    describe("updateAsync", () => {
      it("should update value using transform function and notify asynchronously", async () => {
        const handler = vi.fn();
        observable.onChange(handler);

        await observable.updateAsync((val) => val * 2);

        expect(observable.get()).toBe(20);
        expect(handler).toHaveBeenCalledWith(20);
      });

      it("should not notify if transform returns same value", async () => {
        const handler = vi.fn();
        observable.onChange(handler);

        await observable.updateAsync((val) => val);

        expect(observable.get()).toBe(10);
        expect(handler).not.toHaveBeenCalled();
      });

      it("should wait for all async handlers", async () => {
        const results: string[] = [];

        const slowHandler1 = vi
          .fn()
          .mockImplementation(async (value: number) => {
            await new Promise((resolve) => setTimeout(resolve, 30));
            results.push(`first: ${value}`);
          });

        const slowHandler2 = vi
          .fn()
          .mockImplementation(async (value: number) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            results.push(`second: ${value}`);
          });

        observable.onChange(slowHandler1);
        observable.onChange(slowHandler2);

        await observable.updateAsync((val) => val + 5);

        expect(results.length).toBe(2);
        expect(results).toContain("first: 15");
        expect(results).toContain("second: 15");
      });

      it("should handle errors in transform function", async () => {
        const handler = vi.fn();
        observable.onChange(handler);

        await expect(
          observable.updateAsync(() => {
            throw new Error("Transform error");
          }),
        ).rejects.toThrow("Transform error");

        // Value should remain unchanged
        expect(observable.get()).toBe(10);
        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe("async integration with derived observables", () => {
      it("should propagate async updates to derived observables", async () => {
        const doubled = observable.map((x) => x * 2);
        const doubledHandler = vi.fn();

        doubled.onChange(doubledHandler);

        await observable.setAsync(15);

        expect(doubled.get()).toBe(30);
        expect(doubledHandler).toHaveBeenCalledWith(30);
      });

      it("should handle complex dependency chains asynchronously", async () => {
        const doubled = observable.map((x) => x * 2);
        const plusOne = doubled.map((x) => x + 1);
        const asString = plusOne.map((x) => `Value: ${x}`);

        const results: string[] = [];
        const stringHandler = vi
          .fn()
          .mockImplementation(async (value: string) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            results.push(value);
          });

        asString.onChange(stringHandler);

        await observable.setAsync(5);

        // We need to wait for the async handler to complete
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(doubled.get()).toBe(10);
        expect(plusOne.get()).toBe(11);
        expect(asString.get()).toBe("Value: 11");
        expect(results).toEqual(["Value: 11"]);
      });
    });
  });
});
