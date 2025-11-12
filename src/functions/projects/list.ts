import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAllProjects } from "../../shared/db";
import { internalErrorResponse, successResponse } from "../../shared/responses";

export async function handler(
	_event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const allProjects = await getAllProjects();

		// const userId = getUserIdFromEvent(event);
		// const projects = userId
		// 	? allProjects.filter((project) => project.userId === userId)
		// 	: allProjects;

		// MVP: Show all projects to all users (no userId filtering for demo purposes)
		const projects = allProjects;

		return successResponse({ projects });
	} catch (error: unknown) {
		console.error("Error listing projects:", error);
		return internalErrorResponse(error);
	}
}
