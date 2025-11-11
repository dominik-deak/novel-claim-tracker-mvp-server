import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getClaim, getProject, unlinkProjectFromClaim } from "../../shared/db";
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
		const claimId = getPathParameter(event, "id");
		const projectId = getPathParameter(event, "projectId");
		if (!claimId) {
			return notFoundResponse("Claim", "");
		}
		if (!projectId) {
			return notFoundResponse("Project", "");
		}

		const claim = await getClaim(claimId);
		if (!claim) {
			return notFoundResponse("Claim", claimId);
		}

		const project = await getProject(projectId);
		if (!project) {
			return notFoundResponse("Project", projectId);
		}

		await unlinkProjectFromClaim(claimId, projectId);

		return successResponse({
			message: "Project unlinked successfully",
		});
	} catch (error: unknown) {
		console.error("Error unlinking project:", error);
		return internalErrorResponse(error);
	}
}
