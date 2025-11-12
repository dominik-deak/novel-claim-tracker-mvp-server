import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ZodError } from "zod";
import { getClaim, getProjectsForClaim, updateClaim } from "../../shared/db";
import {
	internalErrorResponse,
	notFoundResponse,
	successResponse,
	validationErrorResponse,
} from "../../shared/responses";
import { UpdateClaimSchema } from "../../shared/schemas";
import { validateStatusTransition } from "../../shared/statusValidation";
import type { ClaimWithProjects } from "../../shared/types";
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
		const validated = UpdateClaimSchema.parse(body);
		const existingClaim = await getClaim(claimId);
		if (!existingClaim) {
			return notFoundResponse("Claim", claimId);
		}

		if (validated.status && validated.status !== existingClaim.status) {
			try {
				validateStatusTransition(existingClaim.status, validated.status);
			} catch (error: unknown) {
				if (error instanceof Error) {
					return validationErrorResponse([
						{
							message: error.message,
							path: ["status"],
						},
					]);
				}
				throw error;
			}
		}

		const updatedClaim = await updateClaim(claimId, validated);

		const projects = await getProjectsForClaim(claimId);
		const claimWithProjects: ClaimWithProjects = {
			...updatedClaim,
			projects,
		};

		return successResponse({ claim: claimWithProjects });
	} catch (error: unknown) {
		console.error("Error updating claim:", error);
		if (error instanceof ZodError) {
			return validationErrorResponse(error.issues);
		}

		return internalErrorResponse(error);
	}
}
