import { EventEmitter } from "./event-emitter";
import type { EventHandler } from "./types";

interface TestEvents {
  test: string;
  count: number;
  data: { id: number; value: string };
}

describe("EventEmitter", () => {
  let emitter: EventEmitter<TestEvents>;
  let mockCallback: jest.Mock;
  let mockErrorHandler: jest.Mock;

  beforeEach(() => {
    emitter = new EventEmitter(["test", "count", "data"]);
    mockCallback = jest.fn();
    mockErrorHandler = jest.fn();
  });

  describe("constructor", () => {
    it("should throw on duplicate events", () => {
      expect(() => new EventEmitter(["test", "test"])).toThrow(
        "Duplicate events",
      );
    });

    it("should initialize with given events", () => {
      expect(emitter.getEvents()).toEqual(["test", "count", "data"]);
    });
  });

  describe("on/off", () => {
    it("should register and handle events with correct types", () => {
      emitter.on("test", mockCallback);
      emitter.emit("test", "hello");
      expect(mockCallback).toHaveBeenCalledWith("hello");
    });

    it("should allow multiple handlers per event", () => {
      const mockCallback2 = jest.fn();
      emitter.on("test", mockCallback);
      emitter.on("test", mockCallback2);

      emitter.emit("test", "hello");

      expect(mockCallback).toHaveBeenCalledWith("hello");
      expect(mockCallback2).toHaveBeenCalledWith("hello");
    });

    it("should properly remove handlers", () => {
      emitter.on("test", mockCallback);
      emitter.off("test", mockCallback);
      emitter.emit("test", "hello");
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should handle unregistered events silently", () => {
      // @ts-expect-error Testing runtime behavior with invalid event
      emitter.on("invalid", mockCallback);
      // @ts-expect-error Testing runtime behavior with invalid event
      emitter.emit("invalid", "hello");
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should handle removal of non-existent handlers", () => {
      emitter.off("test", mockCallback);
      emitter.emit("test", "hello");
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should maintain separate handlers for different events", () => {
      const testHandler = jest.fn();
      const countHandler = jest.fn();

      emitter.on("test", testHandler);
      emitter.on("count", countHandler);

      emitter.emit("test", "hello");
      expect(testHandler).toHaveBeenCalledWith("hello");
      expect(countHandler).not.toHaveBeenCalled();

      emitter.emit("count", 42);
      expect(countHandler).toHaveBeenCalledWith(42);
      expect(testHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should handle errors with registered error handler", () => {
      const throwingCallback = () => {
        throw new Error("test error");
      };

      emitter.on("test", throwingCallback);
      emitter.onError("test", mockErrorHandler);
      emitter.emit("test", "hello");

      expect(mockErrorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should remove error handlers", () => {
      const throwingCallback = () => {
        throw new Error("test error");
      };

      emitter.on("test", throwingCallback);
      emitter.onError("test", mockErrorHandler);
      emitter.offError("test", mockErrorHandler);

      const consoleLogSpy = jest.spyOn(console, "error").mockImplementation();
      emitter.emit("test", "hello");

      expect(mockErrorHandler).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));

      consoleLogSpy.mockRestore();
    });

    it("should handle multiple error handlers", () => {
      const throwingCallback = () => {
        throw new Error("test error");
      };
      const mockErrorHandler2 = jest.fn();

      emitter.on("test", throwingCallback);
      emitter.onError("test", mockErrorHandler);
      emitter.onError("test", mockErrorHandler2);

      emitter.emit("test", "hello");

      expect(mockErrorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(mockErrorHandler2).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle errors for unregistered events silently", () => {
      // @ts-expect-error Testing runtime behavior with invalid event
      emitter.onError("invalid", mockErrorHandler);
      // @ts-expect-error Testing runtime behavior with invalid event
      emitter.offError("invalid", mockErrorHandler);
    });
  });

  describe("type safety", () => {
    it("should handle different event types correctly", () => {
      const stringHandler = jest.fn();
      const numberHandler = jest.fn();
      const dataHandler = jest.fn();

      emitter.on("test", stringHandler);
      emitter.on("count", numberHandler);
      emitter.on("data", dataHandler);

      emitter.emit("test", "string data");
      emitter.emit("count", 42);
      emitter.emit("data", { id: 1, value: "test" });

      expect(stringHandler).toHaveBeenCalledWith("string data");
      expect(numberHandler).toHaveBeenCalledWith(42);
      expect(dataHandler).toHaveBeenCalledWith({ id: 1, value: "test" });
    });

    it("should maintain type safety with error handlers", () => {
      const handler = (data?: string) => {
        throw new Error(data);
      };

      emitter.on("test", handler as EventHandler);
      emitter.onError("test", (error) => {
        expect(error.message).toBe("hello");
      });

      emitter.emit("test", "hello");
    });
  });

  describe("cleanup", () => {
    it("should remove all handlers on destroy", () => {
      emitter.on("test", mockCallback);
      emitter.destroy();
      emitter.emit("test", "hello");
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should remove all error handlers on destroy", () => {
      const throwingCallback = () => {
        throw new Error("test error");
      };

      emitter.on("test", throwingCallback);
      emitter.onError("test", mockErrorHandler);
      emitter.destroy();
      emitter.emit("test", "hello");
      expect(mockErrorHandler).not.toHaveBeenCalled();
    });

    it("should clear event list on destroy", () => {
      emitter.destroy();
      expect(emitter.getEvents()).toEqual([]);
    });

    it("should handle operations after destroy gracefully", () => {
      emitter.destroy();

      // None of these should throw
      emitter.on("test", mockCallback);
      emitter.off("test", mockCallback);
      emitter.emit("test", "hello");
      emitter.onError("test", mockErrorHandler);
      emitter.offError("test", mockErrorHandler);

      expect(mockCallback).not.toHaveBeenCalled();
      expect(mockErrorHandler).not.toHaveBeenCalled();
    });
  });

  describe("utility methods", () => {
    it("should return all registered events", () => {
      expect(emitter.getEvents()).toEqual(["test", "count", "data"]);
    });
  });
});
