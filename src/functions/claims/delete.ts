import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
	deleteAllProjectLinksForClaim,
	deleteClaim,
	getClaim,
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
		const claimId = getPathParameter(event, "id");
		if (!claimId) {
			return notFoundResponse("Claim", "");
		}

		const claim = await getClaim(claimId);
		if (!claim) {
			return notFoundResponse("Claim", claimId);
		}

		await deleteAllProjectLinksForClaim(claimId);
		await deleteClaim(claimId);

		return successResponse({ message: "Claim deleted successfully" }, 204);
	} catch (error: unknown) {
		console.error("Error deleting claim:", error);
		return internalErrorResponse(error);
	}
}
