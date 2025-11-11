import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getClaim, getProjectsForClaim } from "../../shared/db";
import {
	internalErrorResponse,
	notFoundResponse,
	successResponse,
} from "../../shared/responses";
import type { ClaimWithProjects } from "../../shared/types";
import { getPathParameter } from "../../shared/utils";

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	try {
		const claimId = getPathParameter(event, "id");
		if (!claimId) {
			return notFoundResponse("Claim", "");
		}

		const claim = await getClaim(claimId);
		if (!claim) {
			return notFoundResponse("Claim", claimId);
		}

		const projects = await getProjectsForClaim(claimId);
		const claimWithProjects: ClaimWithProjects = {
			...claim,
			projects,
		};

		return successResponse({ claim: claimWithProjects });
	} catch (error: unknown) {
		console.error("Error getting claim:", error);
		return internalErrorResponse(error);
	}
}
