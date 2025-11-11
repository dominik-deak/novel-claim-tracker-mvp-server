import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAllProjects } from "../../shared/db";
import { internalErrorResponse, successResponse } from "../../shared/responses";

export async function handler(
	_event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const projects = await getAllProjects();
		return successResponse({ projects });
	} catch (error: unknown) {
		console.error("Error listing projects:", error);
		return internalErrorResponse(error);
	}
}
