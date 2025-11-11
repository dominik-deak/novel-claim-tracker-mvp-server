import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ZodError } from "zod";
import { getProject, updateProject } from "../../shared/db";
import {
	internalErrorResponse,
	notFoundResponse,
	successResponse,
	validationErrorResponse,
} from "../../shared/responses";
import { UpdateProjectSchema } from "../../shared/schemas";
import { getPathParameter, parseRequestBody } from "../../shared/utils";

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const projectId = getPathParameter(event, "id");
		if (!projectId) {
			return notFoundResponse("Project", "");
		}

		const body = parseRequestBody(event.body);
		const validated = UpdateProjectSchema.parse(body);

		const existingProject = await getProject(projectId);
		if (!existingProject) {
			return notFoundResponse("Project", projectId);
		}

		const updatedProject = await updateProject(projectId, validated);
		return successResponse({ project: updatedProject });
	} catch (error: unknown) {
		console.error("Error updating project:", error);
		if (error instanceof ZodError) {
			return validationErrorResponse(error.issues);
		}

		return internalErrorResponse(error);
	}
}
