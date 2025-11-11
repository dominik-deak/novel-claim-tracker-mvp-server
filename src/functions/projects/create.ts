import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ZodError } from "zod";
import { getUserIdFromEvent } from "../../shared/auth";
import { saveProject } from "../../shared/db";
import {
	internalErrorResponse,
	successResponse,
	validationErrorResponse,
} from "../../shared/responses";
import { CreateProjectSchema } from "../../shared/schemas";
import type { Project } from "../../shared/types";
import {
	generateId,
	getCurrentTimestamp,
	parseRequestBody,
} from "../../shared/utils";

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const body = parseRequestBody(event.body);
		const validated = CreateProjectSchema.parse(body);

		const userId = getUserIdFromEvent(event);
		const now = getCurrentTimestamp();
		const project: Project = {
			projectId: generateId(),
			name: validated.name,
			description: validated.description,
			userId,
			createdAt: now,
			updatedAt: now,
		};

		await saveProject(project);

		return successResponse({ project }, 201);
	} catch (error: unknown) {
		console.error("Error creating project:", error);
		if (error instanceof ZodError) {
			return validationErrorResponse(error.issues);
		}

		return internalErrorResponse(error);
	}
}
