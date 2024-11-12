import { ObservableRegistry } from "./registry";

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
			const handler = jest.fn();
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
			const handler = jest.fn();
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
			const handler = jest.fn();
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

			const handler = jest.fn();
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
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			registry.onChange(handler1);
			registry.onChange(handler2);

			registry.register("test", 123);

			expect(handler1).toHaveBeenCalled();
			expect(handler2).toHaveBeenCalled();
		});

		it("should allow observer removal", () => {
			const handler = jest.fn();
			const unsubscribe = registry.onChange(handler);

			registry.register("test", 123);
			expect(handler).toHaveBeenCalledTimes(1);

			unsubscribe();
			registry.register("another", 456);
			expect(handler).toHaveBeenCalledTimes(1); // Still just once
		});
	});
});
