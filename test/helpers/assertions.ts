import type { APIGatewayProxyResult } from "aws-lambda";

export function expectSuccessResponse(
	result: APIGatewayProxyResult,
	statusCode = 200,
) {
	expect(result.statusCode).toBe(statusCode);
	expect(result.headers).toMatchObject({
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
	});
	expect(result.body).toBeDefined();
}

export function expectErrorResponse(
	result: APIGatewayProxyResult,
	statusCode: number,
	errorMessage?: string,
) {
	expect(result.statusCode).toBe(statusCode);
	expect(result.headers).toMatchObject({
		"Content-Type": "application/json",
		"Access-Control-Allow-Origin": "*",
	});
	const body = JSON.parse(result.body);
	expect(body.error).toBeDefined();
	if (errorMessage) {
		expect(body.error).toContain(errorMessage);
	}
}

export function parseResponseBody<T>(result: APIGatewayProxyResult): T {
	return JSON.parse(result.body) as T;
}

export function expectValidationError(result: APIGatewayProxyResult) {
	expectErrorResponse(result, 400, "Validation failed");
	const body = JSON.parse(result.body);
	expect(body.details).toBeDefined();
	expect(Array.isArray(body.details)).toBe(true);
}
