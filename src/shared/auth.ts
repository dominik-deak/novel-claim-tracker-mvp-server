import type { APIGatewayProxyEvent } from "aws-lambda";

export function getUserIdFromEvent(event: APIGatewayProxyEvent): string | null {
	return (
		event.headers["X-User-Id"] ||
		event.headers["x-user-id"] ||
		event.headers["X-USER-ID"] ||
		null
	);
}
