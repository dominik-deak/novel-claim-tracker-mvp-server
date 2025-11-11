import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ZodError } from "zod";
import { getClaim, updateClaim } from "../../shared/db";
import {
	internalErrorResponse,
	notFoundResponse,
	successResponse,
	validationErrorResponse,
} from "../../shared/responses";
import { UpdateClaimSchema } from "../../shared/schemas";
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

		const updatedClaim = await updateClaim(claimId, validated);

		return successResponse({ claim: updatedClaim });
	} catch (error: unknown) {
		console.error("Error updating claim:", error);
		if (error instanceof ZodError) {
			return validationErrorResponse(error.issues);
		}

		return internalErrorResponse(error);
	}
}
