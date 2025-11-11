import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
	deleteAllClaimLinksForProject,
	deleteProject,
	getProject,
} from "../../shared/db";
import {
	internalErrorResponse,
	notFoundResponse,
	successResponse,
} from "../../shared/responses";
import { getPathParameter } from "../../shared/utils";

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const projectId = getPathParameter(event, "id");
		if (!projectId) {
			return notFoundResponse("Project", "");
		}

		const project = await getProject(projectId);
		if (!project) {
			return notFoundResponse("Project", projectId);
		}

		await deleteAllClaimLinksForProject(projectId);
		await deleteProject(projectId);

		return successResponse({ message: "Project deleted successfully" }, 204);
	} catch (error: unknown) {
		console.error("Error deleting project:", error);
		return internalErrorResponse(error);
	}
}
