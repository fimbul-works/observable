import { ObservableValue } from "./value";

describe("ObservableValue", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
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
      const handler = jest.fn();

      observable.onChange(handler);
      observable.set("test");

      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle Object.is edge cases", () => {
      const observable = new ObservableValue(0);
      const handler = jest.fn();
      observable.onChange(handler);

      // -0 and +0 are different in Object.is
      observable.set(-0);
      expect(handler).toHaveBeenCalledTimes(1);

      // NaN is equal to itself in Object.is
      const nanObservable = new ObservableValue(Number.NaN);
      const nanHandler = jest.fn();
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
      const handler = jest.fn();
      observable.onChange(handler);

      observable.update((val) => val + 1);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(2);
    });

    it("should not notify if transform returns same value", () => {
      const observable = new ObservableValue(42);
      const handler = jest.fn();
      observable.onChange(handler);

      observable.update((val) => val);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle errors in transform function", () => {
      const observable = new ObservableValue(1);
      const handler = jest.fn();
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
      const handler = jest.fn();

      observable.subscribe(handler);
      expect(handler).toHaveBeenCalledWith("initial");
    });

    it("should notify subscriber of subsequent changes", () => {
      const observable = new ObservableValue("initial");
      const handler = jest.fn();

      observable.subscribe(handler);
      observable.set("updated");

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, "initial");
      expect(handler).toHaveBeenNthCalledWith(2, "updated");
    });

    it("should return working unsubscribe function", () => {
      const observable = new ObservableValue("test");
      const handler = jest.fn();

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
      const doubledHandler = jest.fn();
      const squaredHandler = jest.fn();

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
      const errorHandler = jest.fn(() => {
        throw new Error("Observer error");
      });
      const normalHandler = jest.fn();

      observable.onChange(errorHandler);
      observable.onChange(normalHandler);

      observable.set("new value");

      expect(normalHandler).toHaveBeenCalledWith("new value");
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
