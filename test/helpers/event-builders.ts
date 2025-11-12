import type { APIGatewayProxyEvent } from "aws-lambda";

export function createMockEvent(
	overrides?: Partial<APIGatewayProxyEvent>,
): APIGatewayProxyEvent {
	return {
		body: null,
		headers: {},
		multiValueHeaders: {},
		httpMethod: "GET",
		isBase64Encoded: false,
		path: "/",
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		requestContext: {
			accountId: "123456789012",
			apiId: "test-api-id",
			authorizer: null,
			protocol: "HTTP/1.1",
			httpMethod: "GET",
			identity: {
				accessKey: null,
				accountId: null,
				apiKey: null,
				apiKeyId: null,
				caller: null,
				clientCert: null,
				cognitoAuthenticationProvider: null,
				cognitoAuthenticationType: null,
				cognitoIdentityId: null,
				cognitoIdentityPoolId: null,
				principalOrgId: null,
				sourceIp: "127.0.0.1",
				user: null,
				userAgent: "test-agent",
				userArn: null,
				vpcId: undefined,
				vpceId: undefined,
			},
			path: "/",
			stage: "test",
			requestId: "test-request-id",
			requestTimeEpoch: Date.now(),
			resourceId: "test-resource-id",
			resourcePath: "/",
		},
		resource: "/",
		...overrides,
	};
}

export function createPostEvent(
	body: unknown,
	userId?: string,
): APIGatewayProxyEvent {
	return createMockEvent({
		httpMethod: "POST",
		body: JSON.stringify(body),
		headers: userId ? { "X-User-Id": userId } : {},
	});
}

export function createGetEvent(
	queryParams?: Record<string, string>,
	userId?: string,
): APIGatewayProxyEvent {
	return createMockEvent({
		httpMethod: "GET",
		queryStringParameters: queryParams || null,
		headers: userId ? { "X-User-Id": userId } : {},
	});
}

export function createPatchEvent(
	id: string,
	body: unknown,
	userId?: string,
): APIGatewayProxyEvent {
	return createMockEvent({
		httpMethod: "PATCH",
		pathParameters: { id },
		body: JSON.stringify(body),
		headers: userId ? { "X-User-Id": userId } : {},
	});
}

export function createDeleteEvent(
	id: string,
	userId?: string,
): APIGatewayProxyEvent {
	return createMockEvent({
		httpMethod: "DELETE",
		pathParameters: { id },
		headers: userId ? { "X-User-Id": userId } : {},
	});
}

export function createGetByIdEvent(
	id: string,
	userId?: string,
): APIGatewayProxyEvent {
	return createMockEvent({
		httpMethod: "GET",
		pathParameters: { id },
		headers: userId ? { "X-User-Id": userId } : {},
	});
}
