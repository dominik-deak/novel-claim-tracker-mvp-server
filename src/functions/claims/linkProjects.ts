import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ZodError } from "zod";
import { getClaim, getProject, linkProjectToClaim } from "../../shared/db";
import {
	errorResponse,
	internalErrorResponse,
	notFoundResponse,
	successResponse,
	validationErrorResponse,
} from "../../shared/responses";
import { LinkProjectsSchema } from "../../shared/schemas";
import { getPathParameter, parseRequestBody } from "../../shared/utils";

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const claimId = getPathParameter(event, "id");
		if (!claimId) {
			return notFoundResponse("Claim", "");
		}

		const body = parseRequestBody(event.body);
		const validated = LinkProjectsSchema.parse(body);
		const claim = await getClaim(claimId);
		if (!claim) {
			return notFoundResponse("Claim", claimId);
		}

		for (const projectId of validated.projectIds) {
			const project = await getProject(projectId);
			if (!project) {
				return errorResponse(`Project with ID ${projectId} not found`, 404);
			}
			await linkProjectToClaim(claimId, projectId);
		}

		return successResponse({
			message: "Projects linked successfully",
		});
	} catch (error: unknown) {
		console.error("Error linking projects:", error);
		if (error instanceof ZodError) {
			return validationErrorResponse(error.issues);
		}

		return internalErrorResponse(error);
	}
}
