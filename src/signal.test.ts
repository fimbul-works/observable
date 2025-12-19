import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from "vitest";
import { Signal } from "./signal.js";
import type { EventHandler } from "./types.js";

describe("Signal", () => {
  let signal: Signal<string>;
  let mockCallback: MockedFunction<EventHandler>;
  let mockErrorHandler: MockedFunction<EventHandler>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    signal = new Signal<string>();
    mockCallback = vi.fn();
    mockErrorHandler = vi.fn();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      const mockCallback2 = vi.fn();
      const mockCallback3 = vi.fn();

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
      const throwingCallback = vi.fn().mockImplementation(() => {
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
      const mockCallback2 = vi.fn();
      signal.connect(mockCallback);
      signal.connect(mockCallback2);

      const handlerCount = signal.emit("test");
      expect(handlerCount).toBe(2);
    });

    it("should handle multiple callbacks and errors", () => {
      const mockCallback2 = vi.fn();
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

  describe("async handlers", () => {
    it("should handle async callbacks with emit", async () => {
      const asyncCallback = vi.fn().mockImplementation(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `processed ${data}`;
      });

      signal.connect(asyncCallback);
      signal.emit("test");

      // Even though we don't await emit, the callback should have been called
      expect(asyncCallback).toHaveBeenCalledWith("test");

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    it("should handle mixed sync and async callbacks with emit", () => {
      const syncCallback = vi.fn();
      const asyncCallback = vi.fn().mockImplementation(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `processed ${data}`;
      });

      signal.connect(syncCallback);
      signal.connect(asyncCallback);

      const result = signal.emit("test");

      expect(result).toBe(2);
      expect(syncCallback).toHaveBeenCalledWith("test");
      expect(asyncCallback).toHaveBeenCalledWith("test");
    });

    it("should handle async errors properly", async () => {
      const asyncErrorCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("async error");
      });

      signal.connect(asyncErrorCallback);
      signal.connectError(mockErrorHandler);
      signal.emit("test");

      // Error handler should not be called yet
      expect(mockErrorHandler).not.toHaveBeenCalled();

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Now error handler should have been called
      expect(mockErrorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("emitAsync", () => {
    it("should wait for async handlers to complete", async () => {
      const results: string[] = [];

      const asyncCallback1 = vi.fn().mockImplementation(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        results.push(`first ${data}`);
      });

      const asyncCallback2 = vi.fn().mockImplementation(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(`second ${data}`);
      });

      signal.connect(asyncCallback1);
      signal.connect(asyncCallback2);

      await signal.emitAsync("test");

      // Both callbacks should have completed
      expect(results).toContain("first test");
      expect(results).toContain("second test");
      expect(results.length).toBe(2);
    });

    it("should handle mixed sync and async callbacks", async () => {
      const results: string[] = [];

      const syncCallback = vi.fn().mockImplementation((data) => {
        results.push(`sync ${data}`);
      });

      const asyncCallback = vi.fn().mockImplementation(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(`async ${data}`);
      });

      signal.connect(syncCallback);
      signal.connect(asyncCallback);

      await signal.emitAsync("test");

      // Both callbacks should have completed in order
      expect(results).toEqual(["sync test", "async test"]);
    });

    it("should return the number of handlers called", async () => {
      const syncCallback = vi.fn();
      const asyncCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      signal.connect(syncCallback);
      signal.connect(asyncCallback);

      const result = await signal.emitAsync("test");

      expect(result).toBe(2);
    });

    it("should handle errors in async callbacks", async () => {
      const asyncCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("async error");
      });

      signal.connect(asyncCallback);
      signal.connectError(mockErrorHandler);

      await signal.emitAsync("test");

      expect(mockErrorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle errors in both sync and async callbacks", async () => {
      const syncCallback = vi.fn().mockImplementation(() => {
        throw new Error("sync error");
      });

      const asyncCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("async error");
      });

      signal.connect(syncCallback);
      signal.connect(asyncCallback);
      signal.connectError(mockErrorHandler);

      await signal.emitAsync("test");

      expect(mockErrorHandler).toHaveBeenCalledTimes(2);
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: "sync error" }),
      );
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: "async error" }),
      );
    });
  });

  describe("once with async handlers", () => {
    it("should execute async callback only once", async () => {
      const asyncCallback = vi.fn().mockImplementation(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `processed ${data}`;
      });

      signal.once(asyncCallback);

      await signal.emitAsync("test1");
      await signal.emitAsync("test2");

      expect(asyncCallback).toHaveBeenCalledTimes(1);
      expect(asyncCallback).toHaveBeenCalledWith("test1");
    });

    it("should handle async errors in one-time callbacks", async () => {
      const asyncErrorCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("async once error");
      });

      signal.once(asyncErrorCallback);
      signal.connectError(mockErrorHandler);

      await signal.emitAsync("test");
      await signal.emitAsync("test2");

      expect(asyncErrorCallback).toHaveBeenCalledTimes(1);
      expect(mockErrorHandler).toHaveBeenCalledTimes(1);
      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "async once error",
        }),
      );
    });
  });

  describe("conditionally async handlers", () => {
    it("should handle handlers that are sometimes async", async () => {
      const results: string[] = [];

      // This handler is sync or async depending on input
      const conditionalHandler = vi.fn().mockImplementation((data: string) => {
        if (data.includes("async")) {
          return (async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            results.push(`async handled ${data}`);
          })();
        }
        results.push(`sync handled ${data}`);
        return undefined; // synchronous return
      });

      signal.connect(conditionalHandler);

      // Synchronous path
      signal.emit("sync test");
      expect(results).toEqual(["sync handled sync test"]);

      // Asynchronous path
      results.length = 0;
      await signal.emitAsync("async test");
      expect(results).toEqual(["async handled async test"]);
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
      // @ts-expect-error
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
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error("error handler error");
      });

      signal.connectError(errorHandler);
      signal.connect(() => {
        throw new Error("original error");
      });

      signal.emit("test");

      // First, the original error should be passed to the error handler
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "original error",
        }),
      );

      // Then, when the error handler throws, it should be logged to console
      // console.error is called with two arguments: a message string and the error object
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in error handler:",
        expect.objectContaining({
          message: "error handler error",
        }),
      );
    });
  });

  describe("destroy", () => {
    it("should disconnect all listeners", () => {
      const mockCallback2 = vi.fn();
      const mockCallback3 = vi.fn();

      signal.connect(mockCallback);
      signal.connect(mockCallback2);
      signal.connect(mockCallback3);

      expect(signal.listenerCount()).toEqual(3);

      signal.destroy();

      expect(signal.listenerCount()).toEqual(0);
    });

    it("should disconnect all async listeners too", async () => {
      const asyncCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      signal.connect(mockCallback);
      signal.connect(asyncCallback);

      expect(signal.listenerCount()).toEqual(2);

      signal.destroy();

      await signal.emitAsync("test");

      expect(mockCallback).not.toHaveBeenCalled();
      expect(asyncCallback).not.toHaveBeenCalled();
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
      const numberCallback = vi.fn();
      numberSignal.connect(numberCallback);
      numberSignal.emit(42);
      expect(numberCallback).toHaveBeenCalledWith(42);

      const objectSignal = new Signal<{ id: number; name: string }>();
      const objectCallback = vi.fn();
      objectSignal.connect(objectCallback);
      objectSignal.emit({ id: 1, name: "test" });
      expect(objectCallback).toHaveBeenCalledWith({ id: 1, name: "test" });
    });

    it("should work with different return types", async () => {
      const signal = new Signal<string>();

      // Handler returning void
      const voidCallback = vi.fn().mockImplementation((data: string) => {
        return undefined;
      });

      // Handler returning Promise<void>
      const promiseCallback = vi
        .fn()
        .mockImplementation(async (data: string) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        });

      // Handler returning a value (which should be ignored)
      const valueCallback = vi.fn().mockImplementation((data: string) => {
        return data.toUpperCase();
      });

      signal.connect(voidCallback);
      signal.connect(promiseCallback);
      signal.connect(valueCallback);

      await signal.emitAsync("test");

      expect(voidCallback).toHaveBeenCalledWith("test");
      expect(promiseCallback).toHaveBeenCalledWith("test");
      expect(valueCallback).toHaveBeenCalledWith("test");
    });
  });
});
