import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ZodError } from "zod";
import { getProject, linkProjectToClaim, saveClaim } from "../../shared/db";
import {
	errorResponse,
	internalErrorResponse,
	successResponse,
	validationErrorResponse,
} from "../../shared/responses";
import { CreateClaimSchema } from "../../shared/schemas";
import type { Claim } from "../../shared/types";
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
		const validated = CreateClaimSchema.parse(body);

		const now = getCurrentTimestamp();
		const claim: Claim = {
			claimId: generateId(),
			companyName: validated.companyName,
			claimPeriod: validated.claimPeriod,
			amount: validated.amount,
			status: "Draft",
			userId: null,
			submittedBy: null,
			reviewedBy: null,
			submittedAt: null,
			reviewedAt: null,
			createdAt: now,
			updatedAt: now,
		};

		await saveClaim(claim);

		if (validated.projectIds && validated.projectIds.length > 0) {
			for (const projectId of validated.projectIds) {
				const project = await getProject(projectId);
				if (!project) {
					return errorResponse(`Project with ID ${projectId} not found`, 404);
				}
				await linkProjectToClaim(claim.claimId, projectId);
			}
		}

		return successResponse({ claim }, 201);
	} catch (error: unknown) {
		console.error("Error creating claim:", error);

		if (error instanceof ZodError) {
			return validationErrorResponse(error.issues);
		}

		return internalErrorResponse(error);
	}
}
