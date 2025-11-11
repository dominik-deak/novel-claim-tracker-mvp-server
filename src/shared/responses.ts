import type { APIGatewayProxyResult } from "aws-lambda";

const CORS_HEADERS = {
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

/**
 * @param data - Response data to send to client
 */
export function successResponse(
	data: unknown,
	statusCode = 200,
): APIGatewayProxyResult {
	return {
		statusCode,
		headers: CORS_HEADERS,
		body: JSON.stringify(data),
	};
}

export function errorResponse(
	message: string,
	statusCode = 400,
): APIGatewayProxyResult {
	return {
		statusCode,
		headers: CORS_HEADERS,
		body: JSON.stringify({
			error: message,
		}),
	};
}

export function validationErrorResponse(
	errors: Array<{ message: string; path: PropertyKey[] }>,
): APIGatewayProxyResult {
	const formattedErrors = errors.map((err) => ({
		field: err.path
			.filter((p): p is string | number => typeof p !== "symbol")
			.join("."),
		message: err.message,
	}));

	return {
		statusCode: 400,
		headers: CORS_HEADERS,
		body: JSON.stringify({
			error: "Validation failed",
			details: formattedErrors,
		}),
	};
}

export function notFoundResponse(
	resource: string,
	id: string,
): APIGatewayProxyResult {
	return errorResponse(`${resource} with ID ${id} not found`, 404);
}

/**
 * @param error - Error object
 */
export function internalErrorResponse(error: unknown): APIGatewayProxyResult {
	console.error("Internal server error:", error);

	return {
		statusCode: 500,
		headers: CORS_HEADERS,
		body: JSON.stringify({
			error: "Internal server error",
			...(process.env.NODE_ENV === "development" && {
				details: error instanceof Error ? error.message : String(error),
			}),
		}),
	};
}
