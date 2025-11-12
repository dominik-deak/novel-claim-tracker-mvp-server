import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ZodError } from "zod";
import { getAllClaims, getProjectsForClaim } from "../../shared/db";
import {
	internalErrorResponse,
	successResponse,
	validationErrorResponse,
} from "../../shared/responses";
import { ClaimQuerySchema } from "../../shared/schemas";
import type { ClaimWithProjects } from "../../shared/types";
import { getQueryParameter } from "../../shared/utils";

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const status = getQueryParameter(event, "status");
		const validated = ClaimQuerySchema.parse({
			status: status ?? undefined,
		});
		const allClaims = await getAllClaims(validated.status);

		// const userId = getUserIdFromEvent(event);
		// const claims = userId
		// 	? allClaims.filter((claim) => claim.userId === userId)
		// 	: allClaims;

		// MVP: Show all claims to all users (no userId filtering for demo purposes)
		const claims = allClaims;

		const claimsWithProjects: ClaimWithProjects[] = await Promise.all(
			claims.map(async (claim) => {
				const projects = await getProjectsForClaim(claim.claimId);
				return {
					...claim,
					projects,
				};
			}),
		);

		return successResponse({ claims: claimsWithProjects });
	} catch (error: unknown) {
		console.error("Error listing claims:", error);
		if (error instanceof ZodError) {
			return validationErrorResponse(error.issues);
		}

		return internalErrorResponse(error);
	}
}
