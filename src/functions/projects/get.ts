import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getClaimsForProject, getProject } from "../../shared/db";
import {
	internalErrorResponse,
	notFoundResponse,
	successResponse,
} from "../../shared/responses";
import type { ProjectWithClaims } from "../../shared/types";
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

		const claims = await getClaimsForProject(projectId);
		const projectWithClaims: ProjectWithClaims = {
			...project,
			claims,
		};

		return successResponse({ project: projectWithClaims });
	} catch (error: unknown) {
		console.error("Error getting project:", error);
		return internalErrorResponse(error);
	}
}
