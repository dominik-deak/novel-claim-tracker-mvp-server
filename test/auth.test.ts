import { getUserIdFromEvent } from "../src/shared/auth";
import { createGetEvent } from "./helpers/event-builders";

describe("getUserIdFromEvent", () => {
	it("should extract userId from X-User-Id header", () => {
		const event = createGetEvent(undefined, "user-123");
		const userId = getUserIdFromEvent(event);
		expect(userId).toBe("user-123");
	});

	it("should extract userId from lowercase x-user-id header", () => {
		const event = createGetEvent();
		event.headers["x-user-id"] = "user-456";
		const userId = getUserIdFromEvent(event);
		expect(userId).toBe("user-456");
	});

	it("should extract userId from uppercase X-USER-ID header", () => {
		const event = createGetEvent();
		event.headers["X-USER-ID"] = "user-789";
		const userId = getUserIdFromEvent(event);
		expect(userId).toBe("user-789");
	});

	it("should return null when no user header is present", () => {
		const event = createGetEvent();
		const userId = getUserIdFromEvent(event);
		expect(userId).toBeNull();
	});

	it("should prioritize X-User-Id over other variations", () => {
		const event = createGetEvent();
		event.headers["X-User-Id"] = "user-correct";
		event.headers["x-user-id"] = "user-wrong";
		event.headers["X-USER-ID"] = "user-also-wrong";
		const userId = getUserIdFromEvent(event);
		expect(userId).toBe("user-correct");
	});

	it("should handle empty string user ID", () => {
		const event = createGetEvent(undefined, "");
		const userId = getUserIdFromEvent(event);
		expect(userId).toBe(null);
	});
});
