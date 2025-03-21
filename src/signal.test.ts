import { Signal } from "./signal";

describe("Signal", () => {
  let signal: Signal<string>;
  let mockCallback: jest.Mock;
  let mockErrorHandler: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    signal = new Signal<string>();
    mockCallback = jest.fn();
    mockErrorHandler = jest.fn();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe("connect/disconnect", () => {
    it("should register and remove a callback", () => {
      signal.connect(mockCallback);
      signal.emit("test");
      expect(mockCallback).toHaveBeenCalledWith("test");

      signal.disconnect(mockCallback);
      signal.emit("test2");
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should return cleanup function from connect", () => {
      const cleanup = signal.connect(mockCallback);
      signal.emit("test");
      expect(mockCallback).toHaveBeenCalledWith("test");

      cleanup();
      signal.emit("test2");
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should disconnect all handlers when called without argument", () => {
      const mockCallback2 = jest.fn();
      const mockCallback3 = jest.fn();

      signal.connect(mockCallback);
      signal.connect(mockCallback2);
      signal.connect(mockCallback3);

      signal.disconnect();
      signal.emit("test");

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockCallback2).not.toHaveBeenCalled();
      expect(mockCallback3).not.toHaveBeenCalled();
    });
  });

  describe("once", () => {
    it("should execute callback only once", () => {
      signal.once(mockCallback);

      signal.emit("test1");
      signal.emit("test2");

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith("test1");
    });

    it("should handle error in one-time callback", () => {
      const throwingCallback = jest.fn().mockImplementation(() => {
        throw new Error("test error");
      });

      signal.once(throwingCallback);
      signal.connectError(mockErrorHandler);

      signal.emit("test");
      signal.emit("test2");

      expect(throwingCallback).toHaveBeenCalledTimes(1);
      expect(mockErrorHandler).toHaveBeenCalledTimes(1);
    });

    it("should return cleanup function", () => {
      const cleanup = signal.once(mockCallback);
      cleanup();

      signal.emit("test");
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("emit", () => {
    it("should return number of handled callbacks", () => {
      const mockCallback2 = jest.fn();
      signal.connect(mockCallback);
      signal.connect(mockCallback2);

      const handlerCount = signal.emit("test");
      expect(handlerCount).toBe(2);
    });

    it("should handle multiple callbacks and errors", () => {
      const mockCallback2 = jest.fn();
      const throwingCallback = () => {
        throw new Error("test error");
      };

      signal.connect(throwingCallback);
      signal.connect(mockCallback);
      signal.connect(mockCallback2);
      signal.connectError(mockErrorHandler);

      signal.emit("test");

      expect(mockCallback).toHaveBeenCalledWith("test");
      expect(mockCallback2).toHaveBeenCalledWith("test");
      expect(mockErrorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should maintain callback order", () => {
      const order: number[] = [];
      signal.connect(() => {
        order.push(1);
      });
      signal.connect(() => {
        order.push(2);
      });
      signal.connect(() => {
        order.push(3);
      });

      signal.emit("test");
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe("error handling", () => {
    it("should handle non-Error thrown objects", () => {
      const throwingCallback = () => {
        throw "string error"; // Deliberately throwing non-Error
      };

      signal.connect(throwingCallback);
      signal.connectError(mockErrorHandler);

      signal.emit("test");
      expect(mockErrorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(mockErrorHandler.mock.calls[0][0].message).toBe("string error");
    });

    it("should fallback to console.error when no error handlers", () => {
      const throwingCallback = () => {
        throw new Error("test error");
      };

      signal.connect(throwingCallback);
      signal.emit("test");

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle cascading errors in error handlers", () => {
      signal.connectError(() => {
        throw new Error("error handler error");
      });

      signal.connect(() => {
        throw new Error("original error");
      });

      expect(() => signal.emit("test")).toThrow("error handler error");
    });
  });

  describe("destroy", () => {
    it("should disconnect all listeners", () => {
      const mockCallback2 = jest.fn();
      const mockCallback3 = jest.fn();

      signal.connect(mockCallback);
      signal.connect(mockCallback2);
      signal.connect(mockCallback3);

      expect(signal.listenerCount()).toEqual(3);

      signal.destroy();

      expect(signal.listenerCount()).toEqual(0);
    });
  });

  describe("utility methods", () => {
    it("should report correct listener count", () => {
      expect(signal.listenerCount()).toBe(0);

      signal.connect(mockCallback);
      expect(signal.listenerCount()).toBe(1);

      signal.once(() => {});
      expect(signal.listenerCount()).toBe(2);

      signal.disconnect(mockCallback);
      expect(signal.listenerCount()).toBe(1);
    });

    it("should correctly report if has handlers", () => {
      expect(signal.hasHandlers()).toBe(false);

      signal.connect(mockCallback);
      expect(signal.hasHandlers()).toBe(true);

      signal.disconnect(mockCallback);
      expect(signal.hasHandlers()).toBe(false);

      signal.once(mockCallback);
      expect(signal.hasHandlers()).toBe(true);
    });
  });

  describe("type safety", () => {
    it("should work with different data types", () => {
      const numberSignal = new Signal<number>();
      const numberCallback = jest.fn();
      numberSignal.connect(numberCallback);
      numberSignal.emit(42);
      expect(numberCallback).toHaveBeenCalledWith(42);

      const objectSignal = new Signal<{ id: number; name: string }>();
      const objectCallback = jest.fn();
      objectSignal.connect(objectCallback);
      objectSignal.emit({ id: 1, name: "test" });
      expect(objectCallback).toHaveBeenCalledWith({ id: 1, name: "test" });
    });
  });
});
