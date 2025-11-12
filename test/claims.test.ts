import { handler as createHandler } from "../src/functions/claims/create";
import { handler as deleteHandler } from "../src/functions/claims/delete";
import { handler as getHandler } from "../src/functions/claims/get";
import { handler as linkProjectsHandler } from "../src/functions/claims/linkProjects";
import { handler as listHandler } from "../src/functions/claims/list";
import { handler as unlinkProjectHandler } from "../src/functions/claims/unlinkProject";
import { handler as updateHandler } from "../src/functions/claims/update";
import * as db from "../src/shared/db";
import {
	expectErrorResponse,
	expectSuccessResponse,
	expectValidationError,
	parseResponseBody,
} from "./helpers/assertions";
import { createMockClaim, createMockProject } from "./helpers/dynamodb-mock";
import {
	createDeleteEvent,
	createGetByIdEvent,
	createGetEvent,
	createPatchEvent,
	createPostEvent,
} from "./helpers/event-builders";

jest.mock("../src/shared/db");
jest.mock("../src/shared/utils", () => ({
	...jest.requireActual("../src/shared/utils"),
	generateId: jest.fn(() => "generated-id"),
	getCurrentTimestamp: jest.fn(() => "2024-01-01T00:00:00.000Z"),
}));

const mockDb = db as jest.Mocked<typeof db>;

describe("Claims API", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("CREATE /claims", () => {
		const validClaimData = {
			companyName: "Acme Corp",
			claimPeriod: { startDate: "2024-01-01", endDate: "2024-12-31" },
			amount: 50000,
		};

		it("should create a claim successfully", async () => {
			mockDb.saveClaim.mockResolvedValue();

			const event = createPostEvent(validClaimData, "user-1");
			const result = await createHandler(event);

			expectSuccessResponse(result, 201);
			const body = parseResponseBody<{ claim: typeof createMockClaim }>(result);

			expect(body.claim).toMatchObject({
				claimId: "generated-id",
				companyName: "Acme Corp",
				amount: 50000,
				status: "Draft",
				userId: "user-1",
			});
			expect(mockDb.saveClaim).toHaveBeenCalledWith(
				expect.objectContaining({
					claimId: "generated-id",
					companyName: "Acme Corp",
					userId: "user-1",
				}),
			);
		});

		it("should create claim without userId when no auth header", async () => {
			mockDb.saveClaim.mockResolvedValue();

			const event = createPostEvent(validClaimData);
			const result = await createHandler(event);

			expectSuccessResponse(result, 201);
			expect(mockDb.saveClaim).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: null,
				}),
			);
		});

		it("should create claim with linked projects", async () => {
			mockDb.saveClaim.mockResolvedValue();
			mockDb.getProject.mockResolvedValue(createMockProject());
			mockDb.linkProjectToClaim.mockResolvedValue();

			const dataWithProjects = {
				...validClaimData,
				projectIds: [
					"123e4567-e89b-12d3-a456-426614174001",
					"123e4567-e89b-12d3-a456-426614174002",
				],
			};

			const event = createPostEvent(dataWithProjects, "user-1");
			const result = await createHandler(event);

			expectSuccessResponse(result, 201);
			expect(mockDb.getProject).toHaveBeenCalledTimes(2);
			expect(mockDb.linkProjectToClaim).toHaveBeenCalledTimes(2);
			expect(mockDb.linkProjectToClaim).toHaveBeenCalledWith(
				"generated-id",
				"123e4567-e89b-12d3-a456-426614174001",
			);
		});

		it("should return 404 when linking non-existent project", async () => {
			mockDb.saveClaim.mockResolvedValue();
			mockDb.getProject.mockResolvedValue(null);

			const dataWithProjects = {
				...validClaimData,
				projectIds: ["123e4567-e89b-12d3-a456-999999999999"],
			};

			const event = createPostEvent(dataWithProjects);
			const result = await createHandler(event);

			expectErrorResponse(
				result,
				404,
				"Project with ID 123e4567-e89b-12d3-a456-999999999999 not found",
			);
		});

		it("should return validation error for invalid data", async () => {
			const invalidData = {
				companyName: "",
				amount: -100,
			};

			const event = createPostEvent(invalidData);
			const result = await createHandler(event);

			expectValidationError(result);
		});

		it("should handle database errors gracefully", async () => {
			mockDb.saveClaim.mockRejectedValue(new Error("DB Error"));

			const event = createPostEvent(validClaimData);
			const result = await createHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("LIST /claims", () => {
		it("should list all claims", async () => {
			const claims = [
				createMockClaim({ claimId: "claim-1", userId: "user-1" }),
				createMockClaim({ claimId: "claim-2", userId: "user-2" }),
			];
			mockDb.getAllClaims.mockResolvedValue(claims);
			mockDb.getProjectsForClaim.mockResolvedValue([]);

			const event = createGetEvent();
			const result = await listHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ claims: typeof claims }>(result);
			expect(body.claims).toHaveLength(2);
		});

		it("should filter claims by status", async () => {
			const submittedClaims = [
				createMockClaim({ status: "Submitted", userId: "user-1" }),
			];
			mockDb.getAllClaims.mockResolvedValue(submittedClaims);
			mockDb.getProjectsForClaim.mockResolvedValue([]);

			const event = createGetEvent({ status: "Submitted" });
			const result = await listHandler(event);

			expectSuccessResponse(result);
			expect(mockDb.getAllClaims).toHaveBeenCalledWith("Submitted");
		});

		it("should filter claims by userId", async () => {
			const allClaims = [
				createMockClaim({ claimId: "claim-1", userId: "user-1" }),
				createMockClaim({ claimId: "claim-2", userId: "user-2" }),
			];
			mockDb.getAllClaims.mockResolvedValue(allClaims);
			mockDb.getProjectsForClaim.mockResolvedValue([]);

			const event = createGetEvent(undefined, "user-1");
			const result = await listHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ claims: typeof allClaims }>(result);
			expect(body.claims).toHaveLength(1);
			expect(body.claims[0].userId).toBe("user-1");
		});

		it("should include linked projects", async () => {
			const claims = [createMockClaim()];
			const projects = [createMockProject()];
			mockDb.getAllClaims.mockResolvedValue(claims);
			mockDb.getProjectsForClaim.mockResolvedValue(projects);

			const event = createGetEvent();
			const result = await listHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{
				claims: Array<{ projects: typeof projects }>;
			}>(result);
			expect(body.claims[0].projects).toHaveLength(1);
		});

		it("should handle database errors", async () => {
			mockDb.getAllClaims.mockRejectedValue(new Error("DB Error"));

			const event = createGetEvent();
			const result = await listHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("GET /claims/:id", () => {
		it("should get a claim by ID", async () => {
			const claim = createMockClaim();
			mockDb.getClaim.mockResolvedValue(claim);
			mockDb.getProjectsForClaim.mockResolvedValue([]);

			const event = createGetByIdEvent("claim-123");
			const result = await getHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ claim: typeof claim }>(result);
			expect(body.claim.claimId).toBe("test-claim-id");
			expect(mockDb.getClaim).toHaveBeenCalledWith("claim-123");
		});

		it("should return 404 when claim not found", async () => {
			mockDb.getClaim.mockResolvedValue(null);

			const event = createGetByIdEvent("non-existent");
			const result = await getHandler(event);

			expectErrorResponse(result, 404, "Claim with ID non-existent not found");
		});

		it("should include linked projects", async () => {
			const claim = createMockClaim();
			const projects = [createMockProject(), createMockProject()];
			mockDb.getClaim.mockResolvedValue(claim);
			mockDb.getProjectsForClaim.mockResolvedValue(projects);

			const event = createGetByIdEvent("claim-123");
			const result = await getHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{
				claim: { projects: typeof projects };
			}>(result);
			expect(body.claim.projects).toHaveLength(2);
		});

		it("should return 404 when path parameter is missing", async () => {
			const event = {
				...createGetByIdEvent("claim-123"),
				pathParameters: null,
			};
			const result = await getHandler(event);

			expectErrorResponse(result, 404);
		});

		it("should handle database errors", async () => {
			mockDb.getClaim.mockRejectedValue(new Error("DB Error"));

			const event = createGetByIdEvent("claim-123");
			const result = await getHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("PATCH /claims/:id", () => {
		it("should update claim status", async () => {
			const existingClaim = createMockClaim();
			const updatedClaim = createMockClaim({ status: "Submitted" });
			mockDb.getClaim.mockResolvedValue(existingClaim);
			mockDb.updateClaim.mockResolvedValue(updatedClaim);

			const event = createPatchEvent("claim-123", { status: "Submitted" });
			const result = await updateHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ claim: typeof updatedClaim }>(result);
			expect(body.claim.status).toBe("Submitted");
			expect(mockDb.updateClaim).toHaveBeenCalledWith("claim-123", {
				status: "Submitted",
			});
		});

		it("should return 404 when claim not found", async () => {
			mockDb.getClaim.mockResolvedValue(null);

			const event = createPatchEvent("non-existent", { status: "Submitted" });
			const result = await updateHandler(event);

			expectErrorResponse(result, 404);
		});

		it("should validate update data", async () => {
			const event = createPatchEvent("claim-123", { status: "InvalidStatus" });
			const result = await updateHandler(event);

			expectValidationError(result);
		});

		it("should handle partial updates", async () => {
			const existingClaim = createMockClaim();
			const updatedClaim = createMockClaim({
				companyName: "Updated Corp",
			});
			mockDb.getClaim.mockResolvedValue(existingClaim);
			mockDb.updateClaim.mockResolvedValue(updatedClaim);

			const event = createPatchEvent("claim-123", {
				companyName: "Updated Corp",
			});
			const result = await updateHandler(event);

			expectSuccessResponse(result);
			expect(mockDb.updateClaim).toHaveBeenCalledWith("claim-123", {
				companyName: "Updated Corp",
			});
		});

		it("should return 404 when path parameter is missing", async () => {
			const event = {
				...createPatchEvent("claim-123", { status: "Submitted" }),
				pathParameters: null,
			};
			const result = await updateHandler(event);

			expectErrorResponse(result, 404);
		});

		it("should handle database errors", async () => {
			const existingClaim = createMockClaim();
			mockDb.getClaim.mockResolvedValue(existingClaim);
			mockDb.updateClaim.mockRejectedValue(new Error("DB Error"));

			const event = createPatchEvent("claim-123", { status: "Submitted" });
			const result = await updateHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("DELETE /claims/:id", () => {
		it("should delete a claim", async () => {
			const existingClaim = createMockClaim();
			mockDb.getClaim.mockResolvedValue(existingClaim);
			mockDb.deleteClaim.mockResolvedValue();
			mockDb.deleteAllProjectLinksForClaim.mockResolvedValue();

			const event = createDeleteEvent("claim-123");
			const result = await deleteHandler(event);

			expect(result.statusCode).toBe(204);
			expect(mockDb.deleteClaim).toHaveBeenCalledWith("claim-123");
			expect(mockDb.deleteAllProjectLinksForClaim).toHaveBeenCalledWith(
				"claim-123",
			);
		});

		it("should return 404 when claim not found", async () => {
			mockDb.getClaim.mockResolvedValue(null);

			const event = createDeleteEvent("non-existent");
			const result = await deleteHandler(event);

			expectErrorResponse(result, 404);
		});

		it("should return 404 when path parameter is missing", async () => {
			const event = {
				...createDeleteEvent("claim-123"),
				pathParameters: null,
			};
			const result = await deleteHandler(event);

			expectErrorResponse(result, 404);
		});

		it("should handle database errors", async () => {
			const existingClaim = createMockClaim();
			mockDb.getClaim.mockResolvedValue(existingClaim);
			mockDb.deleteAllProjectLinksForClaim.mockRejectedValue(
				new Error("DB Error"),
			);

			const event = createDeleteEvent("claim-123");
			const result = await deleteHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("POST /claims/:id/projects", () => {
		it("should link projects to claim", async () => {
			const existingClaim = createMockClaim();
			const existingProject = createMockProject();
			mockDb.getClaim.mockResolvedValue(existingClaim);
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.linkProjectToClaim.mockResolvedValue();

			const event = {
				...createGetByIdEvent("claim-123"),
				httpMethod: "POST",
				body: JSON.stringify({
					projectIds: [
						"123e4567-e89b-12d3-a456-426614174001",
						"123e4567-e89b-12d3-a456-426614174002",
					],
				}),
			};
			const result = await linkProjectsHandler(event);

			expectSuccessResponse(result);
			expect(mockDb.linkProjectToClaim).toHaveBeenCalledTimes(2);
		});

		it("should return 404 when claim not found", async () => {
			mockDb.getClaim.mockResolvedValue(null);

			const event = {
				...createGetByIdEvent("non-existent"),
				httpMethod: "POST",
				body: JSON.stringify({
					projectIds: ["123e4567-e89b-12d3-a456-426614174001"],
				}),
			};
			const result = await linkProjectsHandler(event);

			expectErrorResponse(result, 404, "Claim");
		});

		it("should return 404 when project not found", async () => {
			mockDb.getClaim.mockResolvedValue(createMockClaim());
			mockDb.getProject.mockResolvedValue(null);

			const event = {
				...createGetByIdEvent("claim-123"),
				httpMethod: "POST",
				body: JSON.stringify({
					projectIds: ["123e4567-e89b-12d3-a456-999999999999"],
				}),
			};
			const result = await linkProjectsHandler(event);

			expectErrorResponse(result, 404, "Project");
		});

		it("should return 404 when path parameter is missing", async () => {
			const event = {
				...createGetByIdEvent("claim-123"),
				httpMethod: "POST",
				pathParameters: null,
				body: JSON.stringify({
					projectIds: ["123e4567-e89b-12d3-a456-426614174001"],
				}),
			};
			const result = await linkProjectsHandler(event);

			expectErrorResponse(result, 404);
		});

		it("should return validation error for invalid request body", async () => {
			const event = {
				...createGetByIdEvent("claim-123"),
				httpMethod: "POST",
				body: JSON.stringify({
					projectIds: "not-an-array",
				}),
			};
			const result = await linkProjectsHandler(event);

			expectValidationError(result);
		});

		it("should handle database errors", async () => {
			mockDb.getClaim.mockResolvedValue(createMockClaim());
			mockDb.getProject.mockResolvedValue(createMockProject());
			mockDb.linkProjectToClaim.mockRejectedValue(new Error("DB Error"));

			const event = {
				...createGetByIdEvent("claim-123"),
				httpMethod: "POST",
				body: JSON.stringify({
					projectIds: ["123e4567-e89b-12d3-a456-426614174001"],
				}),
			};
			const result = await linkProjectsHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("DELETE /claims/:id/projects/:projectId", () => {
		it("should unlink project from claim", async () => {
			const existingClaim = createMockClaim();
			const existingProject = createMockProject();
			mockDb.getClaim.mockResolvedValue(existingClaim);
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.unlinkProjectFromClaim.mockResolvedValue();

			const event = {
				...createDeleteEvent("claim-123"),
				pathParameters: { id: "claim-123", projectId: "proj-123" },
			};
			const result = await unlinkProjectHandler(event);

			expectSuccessResponse(result);
			expect(mockDb.unlinkProjectFromClaim).toHaveBeenCalledWith(
				"claim-123",
				"proj-123",
			);
		});

		it("should return 404 when claim not found", async () => {
			mockDb.getClaim.mockResolvedValue(null);

			const event = {
				...createDeleteEvent("non-existent"),
				pathParameters: { id: "non-existent", projectId: "proj-123" },
			};
			const result = await unlinkProjectHandler(event);

			expectErrorResponse(result, 404, "Claim");
		});

		it("should return 404 when project not found", async () => {
			mockDb.getClaim.mockResolvedValue(createMockClaim());
			mockDb.getProject.mockResolvedValue(null);

			const event = {
				...createDeleteEvent("claim-123"),
				pathParameters: { id: "claim-123", projectId: "non-existent" },
			};
			const result = await unlinkProjectHandler(event);

			expectErrorResponse(result, 404, "Project");
		});

		it("should return 404 when claimId parameter is missing", async () => {
			const event = {
				...createDeleteEvent("claim-123"),
				pathParameters: { projectId: "proj-123" },
			};
			const result = await unlinkProjectHandler(event);

			expectErrorResponse(result, 404, "Claim");
		});

		it("should return 404 when projectId parameter is missing", async () => {
			const event = {
				...createDeleteEvent("claim-123"),
				pathParameters: { id: "claim-123" },
			};
			const result = await unlinkProjectHandler(event);

			expectErrorResponse(result, 404, "Project");
		});

		it("should handle database errors", async () => {
			mockDb.getClaim.mockResolvedValue(createMockClaim());
			mockDb.getProject.mockResolvedValue(createMockProject());
			mockDb.unlinkProjectFromClaim.mockRejectedValue(new Error("DB Error"));

			const event = {
				...createDeleteEvent("claim-123"),
				pathParameters: { id: "claim-123", projectId: "proj-123" },
			};
			const result = await unlinkProjectHandler(event);

			expectErrorResponse(result, 500);
		});
	});
});
