import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getUserIdFromEvent } from "../../shared/auth";
import { getAllProjects } from "../../shared/db";
import { internalErrorResponse, successResponse } from "../../shared/responses";

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const userId = getUserIdFromEvent(event);
		const allProjects = await getAllProjects();

		const projects = userId
			? allProjects.filter((project) => project.userId === userId)
			: allProjects;

		return successResponse({ projects });
	} catch (error: unknown) {
		console.error("Error listing projects:", error);
		return internalErrorResponse(error);
	}
}
