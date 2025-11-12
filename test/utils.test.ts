import {
	calculatePeriodDays,
	formatAmount,
	formatDate,
	formatDateRange,
	generateId,
	getCurrentTimestamp,
	getPathParameter,
	getQueryParameter,
	isPastDate,
	isValidDate,
	parseAmount,
	parseRequestBody,
} from "../src/shared/utils";

describe("Utils", () => {
	describe("ID Generation", () => {
		describe("generateId", () => {
			it("should return a string", () => {
				const id = generateId();
				expect(typeof id).toBe("string");
			});

			it("should return a non-empty string", () => {
				const id = generateId();
				expect(id.length).toBeGreaterThan(0);
			});
		});
	});

	describe("Timestamp Generation", () => {
		describe("getCurrentTimestamp", () => {
			it("should return ISO 8601 format timestamp", () => {
				const timestamp = getCurrentTimestamp();
				const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
				expect(timestamp).toMatch(isoRegex);
			});

			it("should return a valid parseable date", () => {
				const timestamp = getCurrentTimestamp();
				const date = new Date(timestamp);
				expect(date.getTime()).not.toBeNaN();
			});

			it("should return current time (within 1 second)", () => {
				const timestamp = getCurrentTimestamp();
				const generatedTime = new Date(timestamp).getTime();
				const currentTime = Date.now();
				const diff = Math.abs(currentTime - generatedTime);
				expect(diff).toBeLessThan(1000);
			});
		});
	});

	describe("Amount Formatting and Parsing", () => {
		describe("formatAmount", () => {
			it("should format pence to GBP currency string", () => {
				expect(formatAmount(50000)).toBe("£500.00");
			});

			it("should handle zero amount", () => {
				expect(formatAmount(0)).toBe("£0.00");
			});

			it("should handle large amounts", () => {
				expect(formatAmount(1234567890)).toBe("£12,345,678.90");
			});

			it("should handle amounts with odd pence", () => {
				expect(formatAmount(12345)).toBe("£123.45");
			});

			it("should handle single digit pence", () => {
				expect(formatAmount(105)).toBe("£1.05");
			});

			it("should handle amounts under 100 pence", () => {
				expect(formatAmount(99)).toBe("£0.99");
			});

			it("should round to two decimal places", () => {
				expect(formatAmount(12345)).toBe("£123.45");
				expect(formatAmount(1)).toBe("£0.01");
			});
		});

		describe("parseAmount", () => {
			it("should convert pounds to pence", () => {
				expect(parseAmount(500)).toBe(50000);
			});

			it("should handle zero", () => {
				expect(parseAmount(0)).toBe(0);
			});

			it("should handle decimal amounts", () => {
				expect(parseAmount(123.45)).toBe(12345);
			});

			it("should round to nearest pence", () => {
				expect(parseAmount(123.456)).toBe(12346);
				expect(parseAmount(123.454)).toBe(12345);
			});

			it("should handle very small amounts", () => {
				expect(parseAmount(0.01)).toBe(1);
				expect(parseAmount(0.99)).toBe(99);
			});

			it("should handle large amounts", () => {
				expect(parseAmount(12345678.9)).toBe(1234567890);
			});

			it("should handle negative amounts", () => {
				expect(parseAmount(-100)).toBe(-10000);
			});
		});

		describe("formatAmount and parseAmount round-trip", () => {
			it("should maintain consistency in round-trip conversion", () => {
				const pence = 12345;
				const formatted = formatAmount(pence);
				expect(formatted).toBe("£123.45");
			});
		});
	});

	describe("Date Validation and Formatting", () => {
		describe("isValidDate", () => {
			it("should return true for valid ISO date format", () => {
				expect(isValidDate("2024-01-15")).toBe(true);
				expect(isValidDate("2024-12-31")).toBe(true);
			});

			it("should return false for invalid format", () => {
				expect(isValidDate("15-01-2024")).toBe(false);
				expect(isValidDate("2024/01/15")).toBe(false);
				expect(isValidDate("01-15-2024")).toBe(false);
			});

			it("should return true for dates that JavaScript can parse (lenient)", () => {
				expect(isValidDate("2024-02-30")).toBe(true);
				expect(isValidDate("2023-02-29")).toBe(true);
			});

			it("should return false for completely invalid dates", () => {
				expect(isValidDate("2024-13-01")).toBe(false);
				expect(isValidDate("2024-00-01")).toBe(false);
			});

			it("should return false for incomplete dates", () => {
				expect(isValidDate("2024-01")).toBe(false);
				expect(isValidDate("2024")).toBe(false);
			});

			it("should return false for empty or invalid strings", () => {
				expect(isValidDate("")).toBe(false);
				expect(isValidDate("not-a-date")).toBe(false);
				expect(isValidDate("2024-01-1")).toBe(false);
			});

			it("should return true for leap year dates", () => {
				expect(isValidDate("2024-02-29")).toBe(true);
			});
		});

		describe("formatDate", () => {
			it("should format ISO date to en-GB format", () => {
				const formatted = formatDate("2024-01-15");
				expect(formatted).toBe("15/01/2024");
			});

			it("should format ISO timestamp to en-GB format", () => {
				const formatted = formatDate("2024-01-15T12:00:00.000Z");
				expect(formatted).toBe("15/01/2024");
			});

			it("should handle different months correctly", () => {
				expect(formatDate("2024-12-31")).toBe("31/12/2024");
				expect(formatDate("2024-03-01")).toBe("01/03/2024");
			});
		});

		describe("formatDateRange", () => {
			it("should format date range with en-GB format", () => {
				const range = formatDateRange("2024-01-01", "2024-12-31");
				expect(range).toBe("01/01/2024 - 31/12/2024");
			});

			it("should handle same start and end date", () => {
				const range = formatDateRange("2024-06-15", "2024-06-15");
				expect(range).toBe("15/06/2024 - 15/06/2024");
			});

			it("should handle different years", () => {
				const range = formatDateRange("2023-12-01", "2024-01-31");
				expect(range).toBe("01/12/2023 - 31/01/2024");
			});
		});

		describe("isPastDate", () => {
			it("should return true for dates in the past", () => {
				const pastDate = "2020-01-01T00:00:00.000Z";
				expect(isPastDate(pastDate)).toBe(true);
			});

			it("should return false for future dates", () => {
				const futureDate = new Date();
				futureDate.setFullYear(futureDate.getFullYear() + 1);
				expect(isPastDate(futureDate.toISOString())).toBe(false);
			});

			it("should return true for yesterday", () => {
				const yesterday = new Date();
				yesterday.setDate(yesterday.getDate() - 1);
				expect(isPastDate(yesterday.toISOString())).toBe(true);
			});

			it("should handle dates far in the past", () => {
				expect(isPastDate("1900-01-01T00:00:00.000Z")).toBe(true);
			});
		});

		describe("calculatePeriodDays", () => {
			it("should calculate days between dates", () => {
				const days = calculatePeriodDays("2024-01-01", "2024-01-31");
				expect(days).toBe(30);
			});

			it("should return 0 for same date", () => {
				const days = calculatePeriodDays("2024-01-15", "2024-01-15");
				expect(days).toBe(0);
			});

			it("should handle dates across months", () => {
				const days = calculatePeriodDays("2024-01-15", "2024-02-15");
				expect(days).toBe(31);
			});

			it("should handle dates across years", () => {
				const days = calculatePeriodDays("2023-12-01", "2024-01-01");
				expect(days).toBe(31);
			});

			it("should handle reversed date order (end before start)", () => {
				const days = calculatePeriodDays("2024-01-31", "2024-01-01");
				expect(days).toBe(30);
			});

			it("should calculate full year correctly", () => {
				const days = calculatePeriodDays("2024-01-01", "2024-12-31");
				expect(days).toBe(365);
			});

			it("should handle leap year correctly", () => {
				const days = calculatePeriodDays("2024-02-01", "2024-03-01");
				expect(days).toBe(29);
			});
		});
	});

	describe("Request Body Parsing", () => {
		describe("parseRequestBody", () => {
			it("should parse valid JSON body", () => {
				const body = JSON.stringify({ name: "Test", value: 123 });
				const result = parseRequestBody(body);
				expect(result).toEqual({ name: "Test", value: 123 });
			});

			it("should return empty object for null body", () => {
				const result = parseRequestBody(null);
				expect(result).toEqual({});
			});

			it("should return empty object for undefined body", () => {
				const result = parseRequestBody(undefined);
				expect(result).toEqual({});
			});

			it("should return empty object for empty string", () => {
				const result = parseRequestBody("");
				expect(result).toEqual({});
			});

			it("should return empty object for invalid JSON", () => {
				const result = parseRequestBody("invalid json {");
				expect(result).toEqual({});
			});

			it("should parse nested objects", () => {
				const body = JSON.stringify({
					user: { name: "John", age: 30 },
					active: true,
				});
				const result = parseRequestBody(body);
				expect(result).toEqual({
					user: { name: "John", age: 30 },
					active: true,
				});
			});

			it("should parse arrays", () => {
				const body = JSON.stringify([1, 2, 3]);
				const result = parseRequestBody(body);
				expect(result).toEqual([1, 2, 3]);
			});

			it("should handle special characters in JSON", () => {
				const body = JSON.stringify({ message: 'Quote: "Hello"' });
				const result = parseRequestBody(body);
				expect(result).toEqual({ message: 'Quote: "Hello"' });
			});
		});
	});

	describe("API Gateway Parameter Extraction", () => {
		describe("getPathParameter", () => {
			it("should extract path parameter when present", () => {
				const event = {
					pathParameters: { id: "claim-123", type: "draft" },
				};
				expect(getPathParameter(event, "id")).toBe("claim-123");
				expect(getPathParameter(event, "type")).toBe("draft");
			});

			it("should return null when parameter not found", () => {
				const event = {
					pathParameters: { id: "claim-123" },
				};
				expect(getPathParameter(event, "missing")).toBeNull();
			});

			it("should return null when pathParameters is null", () => {
				const event = { pathParameters: null };
				expect(getPathParameter(event, "id")).toBeNull();
			});

			it("should return null when pathParameters is undefined", () => {
				const event = {};
				expect(getPathParameter(event, "id")).toBeNull();
			});

			it("should handle parameter with undefined value", () => {
				const event = {
					pathParameters: { id: undefined },
				};
				expect(getPathParameter(event, "id")).toBeNull();
			});

			it("should handle empty string parameter", () => {
				const event = {
					pathParameters: { id: "" },
				};
				expect(getPathParameter(event, "id")).toBeNull();
			});

			it("should handle parameter with special characters", () => {
				const event = {
					pathParameters: { id: "claim-123-abc-xyz" },
				};
				expect(getPathParameter(event, "id")).toBe("claim-123-abc-xyz");
			});
		});

		describe("getQueryParameter", () => {
			it("should extract query parameter when present", () => {
				const event = {
					queryStringParameters: { status: "Draft", page: "1" },
				};
				expect(getQueryParameter(event, "status")).toBe("Draft");
				expect(getQueryParameter(event, "page")).toBe("1");
			});

			it("should return null when parameter not found", () => {
				const event = {
					queryStringParameters: { status: "Draft" },
				};
				expect(getQueryParameter(event, "missing")).toBeNull();
			});

			it("should return null when queryStringParameters is null", () => {
				const event = { queryStringParameters: null };
				expect(getQueryParameter(event, "status")).toBeNull();
			});

			it("should return null when queryStringParameters is undefined", () => {
				const event = {};
				expect(getQueryParameter(event, "status")).toBeNull();
			});

			it("should handle parameter with undefined value", () => {
				const event = {
					queryStringParameters: { status: undefined },
				};
				expect(getQueryParameter(event, "status")).toBeNull();
			});

			it("should preserve empty string parameter value", () => {
				const event = {
					queryStringParameters: { search: "" },
				};
				expect(getQueryParameter(event, "search")).toBe("");
			});

			it("should handle parameter with special characters", () => {
				const event = {
					queryStringParameters: { filter: "type:claim,status:draft" },
				};
				expect(getQueryParameter(event, "filter")).toBe(
					"type:claim,status:draft",
				);
			});

			it("should handle URL encoded values", () => {
				const event = {
					queryStringParameters: { company: "Test%20Company" },
				};
				expect(getQueryParameter(event, "company")).toBe("Test%20Company");
			});
		});
	});
});
