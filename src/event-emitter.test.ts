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
    emitter = new EventEmitter<TestEvents>();
    mockCallback = jest.fn();
    mockErrorHandler = jest.fn();
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

  describe("EventEmitter with arbitrary events", () => {
    let emitter: EventEmitter<TestEvents>;
    let mockCallback: jest.Mock;

    beforeEach(() => {
      // Initialize with empty events array
      emitter = new EventEmitter();
      mockCallback = jest.fn();
    });

    it("should allow adding arbitrary events via on() when initialized with empty array", () => {
      // Register handlers for events not specified in constructor
      emitter.on("test", mockCallback);
      emitter.on("count", (data) => mockCallback(data));
      emitter.on("data", (data) => mockCallback(data));

      // Verify events were added
      expect(emitter.getEvents()).toContain("test");
      expect(emitter.getEvents()).toContain("count");
      expect(emitter.getEvents()).toContain("data");
      expect(emitter.getEvents().length).toBe(3);

      // Verify the events work correctly
      emitter.emit("test", "hello");
      expect(mockCallback).toHaveBeenCalledWith("hello");

      emitter.emit("count", 42);
      expect(mockCallback).toHaveBeenCalledWith(42);

      const testData = { id: 1, value: "test" };
      emitter.emit("data", testData);
      expect(mockCallback).toHaveBeenCalledWith(testData);
    });

    it("should maintain type safety with arbitrary events", () => {
      // Register strongly-typed handlers
      const stringHandler = jest.fn();
      const numberHandler = jest.fn();
      const dataHandler = jest.fn();

      emitter.on("test", stringHandler);
      emitter.on("count", numberHandler);
      emitter.on("data", dataHandler);

      // Emit typed events
      emitter.emit("test", "string data");
      emitter.emit("count", 42);
      emitter.emit("data", { id: 1, value: "test" });

      // Verify type safety is maintained
      expect(stringHandler).toHaveBeenCalledWith("string data");
      expect(numberHandler).toHaveBeenCalledWith(42);
      expect(dataHandler).toHaveBeenCalledWith({ id: 1, value: "test" });
    });

    it("should allow registering error handlers for arbitrary events", () => {
      const errorHandler = jest.fn();
      const throwingCallback = () => {
        throw new Error("test error");
      };

      // Register handler and error handler for arbitrary event
      emitter.on("test", throwingCallback);
      emitter.onError("test", errorHandler);

      // Emit event that will cause an error
      emitter.emit("test", "hello");

      // Verify error was handled
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should allow removing handlers for arbitrary events", () => {
      // Register handler for arbitrary event
      emitter.on("test", mockCallback);

      // Verify it works
      emitter.emit("test", "hello");
      expect(mockCallback).toHaveBeenCalledWith("hello");

      // Remove handler
      emitter.off("test", mockCallback);

      // Verify it was removed
      mockCallback.mockClear();
      emitter.emit("test", "hello again");
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should allow removing error handlers for arbitrary events", () => {
      const errorHandler = jest.fn();
      const throwingCallback = () => {
        throw new Error("test error");
      };

      // Register handler and error handler
      emitter.on("test", throwingCallback);
      emitter.onError("test", errorHandler);

      // Remove error handler
      emitter.offError("test", errorHandler);

      // Verify error handler was removed
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      emitter.emit("test", "hello");
      expect(errorHandler).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should not affect existing events when adding new arbitrary events", () => {
      // Initialize with some events
      const initialEmitter = new EventEmitter<TestEvents>();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Register handler for initial event
      initialEmitter.on("test", callback1);

      // Register handler for arbitrary event
      // Use "count" instead of "foobar" since we're emitting a "count" event
      initialEmitter.on("count", callback2);

      // Verify both events work
      initialEmitter.emit("test", "hello");
      expect(callback1).toHaveBeenCalledWith("hello");

      initialEmitter.emit("count", 42);
      expect(callback2).toHaveBeenCalledWith(42);

      // Verify both events are in the event list
      expect(initialEmitter.getEvents()).toContain("test");
      expect(initialEmitter.getEvents()).toContain("count");
      expect(initialEmitter.getEvents().length).toBe(2);
    });

    it("should properly clean up arbitrary events on destroy", () => {
      // Register handlers for arbitrary events
      emitter.on("test", mockCallback);
      emitter.on("count", mockCallback);

      // Verify events were added
      expect(emitter.getEvents().length).toBe(2);

      // Destroy emitter
      emitter.destroy();

      // Verify events were cleaned up
      expect(emitter.getEvents().length).toBe(0);

      // Verify handlers don't work anymore
      emitter.emit("test", "hello");
      emitter.emit("count", 42);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should allow re-adding events after destroy", () => {
      // Register handler for arbitrary event
      emitter.on("test", mockCallback);

      // Destroy emitter
      emitter.destroy();

      // Re-register handler
      emitter.on("test", mockCallback);

      // Verify event works
      emitter.emit("test", "hello");
      expect(mockCallback).toHaveBeenCalledWith("hello");

      // Verify event is in the event list
      expect(emitter.getEvents()).toContain("test");
      expect(emitter.getEvents().length).toBe(1);
    });
  });

  describe("utility methods", () => {
    it("should return all registered events", () => {
      emitter.on("test", mockCallback);
      emitter.on("count", mockCallback);
      emitter.on("data", mockCallback);

      expect(emitter.getEvents()).toEqual(["test", "count", "data"]);
    });
  });
});
