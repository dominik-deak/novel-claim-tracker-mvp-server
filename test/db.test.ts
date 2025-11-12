import {
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
	ScanCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import {
	deleteAllClaimLinksForProject,
	deleteAllProjectLinksForClaim,
	deleteClaim,
	deleteProject,
	getAllClaims,
	getAllProjects,
	getClaim,
	getClaimIdsForProject,
	getClaimsForProject,
	getProject,
	getProjectIdsForClaim,
	getProjectsForClaim,
	linkProjectToClaim,
	saveClaim,
	saveProject,
	unlinkProjectFromClaim,
	updateClaim,
	updateProject,
} from "../src/shared/db";
import { createMockClaim, createMockProject } from "./helpers/dynamodb-mock";

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("Database Layer", () => {
	beforeEach(() => {
		ddbMock.reset();
	});

	describe("Claim Operations", () => {
		describe("saveClaim", () => {
			it("should save a claim with correct PK/SK structure", async () => {
				ddbMock.on(PutCommand).resolves({});

				const claim = createMockClaim({
					claimId: "claim-123",
					companyName: "Test Co",
				});

				await saveClaim(claim);

				const calls = ddbMock.commandCalls(PutCommand);
				expect(calls).toHaveLength(1);
				expect(calls[0].args[0].input).toMatchObject({
					Item: {
						PK: "CLAIM#claim-123",
						SK: "METADATA",
						claimId: "claim-123",
						companyName: "Test Co",
					},
				});
			});
		});

		describe("getClaim", () => {
			it("should retrieve a claim and strip PK/SK keys", async () => {
				const mockClaim = createMockClaim({ claimId: "claim-123" });
				ddbMock.on(GetCommand).resolves({
					Item: {
						PK: "CLAIM#claim-123",
						SK: "METADATA",
						...mockClaim,
					},
				});

				const result = await getClaim("claim-123");

				expect(result).toEqual(mockClaim);
				expect(result).not.toHaveProperty("PK");
				expect(result).not.toHaveProperty("SK");
			});

			it("should return null when claim does not exist", async () => {
				ddbMock.on(GetCommand).resolves({});

				const result = await getClaim("non-existent");

				expect(result).toBeNull();
			});

			it("should query with correct PK/SK", async () => {
				ddbMock.on(GetCommand).resolves({});

				await getClaim("claim-456");

				const calls = ddbMock.commandCalls(GetCommand);
				expect(calls[0].args[0].input.Key).toEqual({
					PK: "CLAIM#claim-456",
					SK: "METADATA",
				});
			});
		});

		describe("getAllClaims", () => {
			it("should return all claims without status filter", async () => {
				const claim1 = createMockClaim({ claimId: "claim-1", status: "Draft" });
				const claim2 = createMockClaim({
					claimId: "claim-2",
					status: "Submitted",
				});

				ddbMock.on(ScanCommand).resolves({
					Items: [
						{ PK: "CLAIM#claim-1", SK: "METADATA", ...claim1 },
						{ PK: "CLAIM#claim-2", SK: "METADATA", ...claim2 },
					],
				});

				const result = await getAllClaims();

				expect(result).toHaveLength(2);
				expect(result[0]).toEqual(claim1);
				expect(result[1]).toEqual(claim2);
				expect(result[0]).not.toHaveProperty("PK");
			});

			it("should filter claims by status when provided", async () => {
				const claim = createMockClaim({ status: "Approved" });
				ddbMock.on(ScanCommand).resolves({
					Items: [{ PK: "CLAIM#claim-1", SK: "METADATA", ...claim }],
				});

				await getAllClaims("Approved");

				const calls = ddbMock.commandCalls(ScanCommand);
				expect(calls[0].args[0].input).toMatchObject({
					FilterExpression: "#status = :status",
					ExpressionAttributeNames: { "#status": "status" },
					ExpressionAttributeValues: { ":status": "Approved" },
				});
			});

			it("should return empty array when no claims exist", async () => {
				ddbMock.on(ScanCommand).resolves({ Items: [] });

				const result = await getAllClaims();

				expect(result).toEqual([]);
			});

			it("should handle undefined Items in response", async () => {
				ddbMock.on(ScanCommand).resolves({});

				const result = await getAllClaims();

				expect(result).toEqual([]);
			});
		});

		describe("updateClaim", () => {
			it("should update claim fields and return updated claim", async () => {
				const updatedClaim = createMockClaim({
					claimId: "claim-123",
					status: "Submitted",
				});

				ddbMock.on(UpdateCommand).resolves({
					Attributes: {
						PK: "CLAIM#claim-123",
						SK: "METADATA",
						...updatedClaim,
					},
				});

				const result = await updateClaim("claim-123", { status: "Submitted" });

				expect(result.status).toBe("Submitted");
				expect(result).not.toHaveProperty("PK");
				expect(result).not.toHaveProperty("SK");
			});

			it("should automatically set updatedAt timestamp", async () => {
				const mockDate = "2024-01-15T12:00:00.000Z";
				jest.spyOn(Date.prototype, "toISOString").mockReturnValue(mockDate);

				ddbMock.on(UpdateCommand).resolves({
					Attributes: {
						PK: "CLAIM#claim-123",
						SK: "METADATA",
						...createMockClaim(),
						updatedAt: mockDate,
					},
				});

				await updateClaim("claim-123", { status: "Approved" });

				const calls = ddbMock.commandCalls(UpdateCommand);
				const attributeValues =
					calls[0].args[0].input.ExpressionAttributeValues;
				expect(Object.values(attributeValues || {})).toContain(mockDate);

				jest.restoreAllMocks();
			});

			it("should throw error when update fails", async () => {
				ddbMock.on(UpdateCommand).resolves({});

				await expect(
					updateClaim("claim-123", { status: "Approved" }),
				).rejects.toThrow("Failed to update claim");
			});

			it("should build correct update expression for multiple fields", async () => {
				ddbMock.on(UpdateCommand).resolves({
					Attributes: {
						PK: "CLAIM#claim-123",
						SK: "METADATA",
						...createMockClaim(),
					},
				});

				await updateClaim("claim-123", {
					status: "Approved",
					amount: 50000,
					reviewedBy: "user-2",
				});

				const calls = ddbMock.commandCalls(UpdateCommand);
				const updateExpression = calls[0].args[0].input.UpdateExpression;
				expect(updateExpression).toContain("SET");
				expect(updateExpression).toContain(",");
			});
		});

		describe("deleteClaim", () => {
			it("should delete a claim with correct PK/SK", async () => {
				ddbMock.on(DeleteCommand).resolves({});

				await deleteClaim("claim-123");

				const calls = ddbMock.commandCalls(DeleteCommand);
				expect(calls).toHaveLength(1);
				expect(calls[0].args[0].input.Key).toEqual({
					PK: "CLAIM#claim-123",
					SK: "METADATA",
				});
			});
		});
	});

	describe("Project Operations", () => {
		describe("saveProject", () => {
			it("should save a project with correct PK/SK structure", async () => {
				ddbMock.on(PutCommand).resolves({});

				const project = createMockProject({
					projectId: "proj-123",
					name: "Test Project",
				});

				await saveProject(project);

				const calls = ddbMock.commandCalls(PutCommand);
				expect(calls).toHaveLength(1);
				expect(calls[0].args[0].input).toMatchObject({
					Item: {
						PK: "PROJECT#proj-123",
						SK: "METADATA",
						projectId: "proj-123",
						name: "Test Project",
					},
				});
			});
		});

		describe("getProject", () => {
			it("should retrieve a project and strip PK/SK keys", async () => {
				const mockProject = createMockProject({ projectId: "proj-123" });
				ddbMock.on(GetCommand).resolves({
					Item: {
						PK: "PROJECT#proj-123",
						SK: "METADATA",
						...mockProject,
					},
				});

				const result = await getProject("proj-123");

				expect(result).toEqual(mockProject);
				expect(result).not.toHaveProperty("PK");
				expect(result).not.toHaveProperty("SK");
			});

			it("should return null when project does not exist", async () => {
				ddbMock.on(GetCommand).resolves({});

				const result = await getProject("non-existent");

				expect(result).toBeNull();
			});
		});

		describe("getAllProjects", () => {
			it("should return all projects", async () => {
				const proj1 = createMockProject({ projectId: "proj-1", name: "Alpha" });
				const proj2 = createMockProject({ projectId: "proj-2", name: "Beta" });

				ddbMock.on(ScanCommand).resolves({
					Items: [
						{ PK: "PROJECT#proj-1", SK: "METADATA", ...proj1 },
						{ PK: "PROJECT#proj-2", SK: "METADATA", ...proj2 },
					],
				});

				const result = await getAllProjects();

				expect(result).toHaveLength(2);
				expect(result[0]).toEqual(proj1);
				expect(result[1]).toEqual(proj2);
				expect(result[0]).not.toHaveProperty("PK");
			});

			it("should return empty array when no projects exist", async () => {
				ddbMock.on(ScanCommand).resolves({ Items: [] });

				const result = await getAllProjects();

				expect(result).toEqual([]);
			});
		});

		describe("updateProject", () => {
			it("should update project fields and return updated project", async () => {
				const updatedProject = createMockProject({
					projectId: "proj-123",
					name: "Updated Name",
				});

				ddbMock.on(UpdateCommand).resolves({
					Attributes: {
						PK: "PROJECT#proj-123",
						SK: "METADATA",
						...updatedProject,
					},
				});

				const result = await updateProject("proj-123", {
					name: "Updated Name",
				});

				expect(result.name).toBe("Updated Name");
				expect(result).not.toHaveProperty("PK");
			});

			it("should throw error when update fails", async () => {
				ddbMock.on(UpdateCommand).resolves({});

				await expect(
					updateProject("proj-123", { name: "New Name" }),
				).rejects.toThrow("Failed to update project");
			});
		});

		describe("deleteProject", () => {
			it("should delete a project with correct PK/SK", async () => {
				ddbMock.on(DeleteCommand).resolves({});

				await deleteProject("proj-123");

				const calls = ddbMock.commandCalls(DeleteCommand);
				expect(calls).toHaveLength(1);
				expect(calls[0].args[0].input.Key).toEqual({
					PK: "PROJECT#proj-123",
					SK: "METADATA",
				});
			});
		});
	});

	describe("Relationship Operations", () => {
		describe("linkProjectToClaim", () => {
			it("should create junction record with correct PK/SK and timestamp", async () => {
				const mockDate = "2024-01-15T12:00:00.000Z";
				jest.spyOn(Date.prototype, "toISOString").mockReturnValue(mockDate);

				ddbMock.on(PutCommand).resolves({});

				await linkProjectToClaim("claim-123", "proj-456");

				const calls = ddbMock.commandCalls(PutCommand);
				expect(calls).toHaveLength(1);
				expect(calls[0].args[0].input).toMatchObject({
					Item: {
						PK: "CLAIM#claim-123",
						SK: "PROJECT#proj-456",
						addedAt: mockDate,
					},
				});

				jest.restoreAllMocks();
			});
		});

		describe("unlinkProjectFromClaim", () => {
			it("should delete junction record with correct PK/SK", async () => {
				ddbMock.on(DeleteCommand).resolves({});

				await unlinkProjectFromClaim("claim-123", "proj-456");

				const calls = ddbMock.commandCalls(DeleteCommand);
				expect(calls).toHaveLength(1);
				expect(calls[0].args[0].input.Key).toEqual({
					PK: "CLAIM#claim-123",
					SK: "PROJECT#proj-456",
				});
			});
		});

		describe("getProjectIdsForClaim", () => {
			it("should return array of project IDs without prefix", async () => {
				ddbMock.on(QueryCommand).resolves({
					Items: [
						{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-1" },
						{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-2" },
						{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-3" },
					],
				});

				const result = await getProjectIdsForClaim("claim-123");

				expect(result).toEqual(["proj-1", "proj-2", "proj-3"]);
			});

			it("should query with correct claim PK", async () => {
				ddbMock.on(QueryCommand).resolves({ Items: [] });

				await getProjectIdsForClaim("claim-456");

				const calls = ddbMock.commandCalls(QueryCommand);
				expect(calls[0].args[0].input).toMatchObject({
					KeyConditionExpression: "PK = :pk",
					ExpressionAttributeValues: { ":pk": "CLAIM#claim-456" },
				});
			});

			it("should return empty array when no projects linked", async () => {
				ddbMock.on(QueryCommand).resolves({ Items: [] });

				const result = await getProjectIdsForClaim("claim-123");

				expect(result).toEqual([]);
			});
		});

		describe("getClaimIdsForProject", () => {
			it("should return array of claim IDs without prefix", async () => {
				ddbMock.on(QueryCommand).resolves({
					Items: [
						{ PK: "CLAIM#claim-1", SK: "PROJECT#proj-123" },
						{ PK: "CLAIM#claim-2", SK: "PROJECT#proj-123" },
					],
				});

				const result = await getClaimIdsForProject("proj-123");

				expect(result).toEqual(["claim-1", "claim-2"]);
			});

			it("should query GSI with correct project SK", async () => {
				ddbMock.on(QueryCommand).resolves({ Items: [] });

				await getClaimIdsForProject("proj-789");

				const calls = ddbMock.commandCalls(QueryCommand);
				expect(calls[0].args[0].input).toMatchObject({
					IndexName: "projectId-index",
					KeyConditionExpression: "SK = :sk",
					ExpressionAttributeValues: { ":sk": "PROJECT#proj-789" },
				});
			});

			it("should return empty array when no claims linked", async () => {
				ddbMock.on(QueryCommand).resolves({ Items: [] });

				const result = await getClaimIdsForProject("proj-123");

				expect(result).toEqual([]);
			});
		});

		describe("getProjectsForClaim", () => {
			it("should return array of full project objects", async () => {
				const proj1 = createMockProject({ projectId: "proj-1" });
				const proj2 = createMockProject({ projectId: "proj-2" });

				ddbMock
					.on(QueryCommand)
					.resolves({
						Items: [
							{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-1" },
							{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-2" },
						],
					})
					.on(GetCommand, { Key: { PK: "PROJECT#proj-1", SK: "METADATA" } })
					.resolves({
						Item: { PK: "PROJECT#proj-1", SK: "METADATA", ...proj1 },
					})
					.on(GetCommand, { Key: { PK: "PROJECT#proj-2", SK: "METADATA" } })
					.resolves({
						Item: { PK: "PROJECT#proj-2", SK: "METADATA", ...proj2 },
					});

				const result = await getProjectsForClaim("claim-123");

				expect(result).toHaveLength(2);
				expect(result[0]).toEqual(proj1);
				expect(result[1]).toEqual(proj2);
			});

			it("should filter out null results when project not found", async () => {
				const proj1 = createMockProject({ projectId: "proj-1" });

				ddbMock
					.on(QueryCommand)
					.resolves({
						Items: [
							{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-1" },
							{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-deleted" },
						],
					})
					.on(GetCommand, { Key: { PK: "PROJECT#proj-1", SK: "METADATA" } })
					.resolves({
						Item: { PK: "PROJECT#proj-1", SK: "METADATA", ...proj1 },
					})
					.on(GetCommand, {
						Key: { PK: "PROJECT#proj-deleted", SK: "METADATA" },
					})
					.resolves({});

				const result = await getProjectsForClaim("claim-123");

				expect(result).toHaveLength(1);
				expect(result[0]).toEqual(proj1);
			});

			it("should return empty array when claim has no projects", async () => {
				ddbMock.on(QueryCommand).resolves({ Items: [] });

				const result = await getProjectsForClaim("claim-123");

				expect(result).toEqual([]);
			});
		});

		describe("getClaimsForProject", () => {
			it("should return array of full claim objects", async () => {
				const claim1 = createMockClaim({ claimId: "claim-1" });
				const claim2 = createMockClaim({ claimId: "claim-2" });

				ddbMock
					.on(QueryCommand)
					.resolves({
						Items: [
							{ PK: "CLAIM#claim-1", SK: "PROJECT#proj-123" },
							{ PK: "CLAIM#claim-2", SK: "PROJECT#proj-123" },
						],
					})
					.on(GetCommand, { Key: { PK: "CLAIM#claim-1", SK: "METADATA" } })
					.resolves({
						Item: { PK: "CLAIM#claim-1", SK: "METADATA", ...claim1 },
					})
					.on(GetCommand, { Key: { PK: "CLAIM#claim-2", SK: "METADATA" } })
					.resolves({
						Item: { PK: "CLAIM#claim-2", SK: "METADATA", ...claim2 },
					});

				const result = await getClaimsForProject("proj-123");

				expect(result).toHaveLength(2);
				expect(result[0]).toEqual(claim1);
				expect(result[1]).toEqual(claim2);
			});

			it("should filter out null results when claim not found", async () => {
				const claim1 = createMockClaim({ claimId: "claim-1" });

				ddbMock
					.on(QueryCommand)
					.resolves({
						Items: [
							{ PK: "CLAIM#claim-1", SK: "PROJECT#proj-123" },
							{ PK: "CLAIM#claim-deleted", SK: "PROJECT#proj-123" },
						],
					})
					.on(GetCommand, { Key: { PK: "CLAIM#claim-1", SK: "METADATA" } })
					.resolves({
						Item: { PK: "CLAIM#claim-1", SK: "METADATA", ...claim1 },
					})
					.on(GetCommand, {
						Key: { PK: "CLAIM#claim-deleted", SK: "METADATA" },
					})
					.resolves({});

				const result = await getClaimsForProject("proj-123");

				expect(result).toHaveLength(1);
				expect(result[0]).toEqual(claim1);
			});
		});

		describe("deleteAllProjectLinksForClaim", () => {
			it("should delete all project links for a claim", async () => {
				ddbMock
					.on(QueryCommand)
					.resolves({
						Items: [
							{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-1" },
							{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-2" },
							{ PK: "CLAIM#claim-123", SK: "PROJECT#proj-3" },
						],
					})
					.on(DeleteCommand)
					.resolves({});

				await deleteAllProjectLinksForClaim("claim-123");

				const deleteCalls = ddbMock.commandCalls(DeleteCommand);
				expect(deleteCalls).toHaveLength(3);
				expect(deleteCalls[0].args[0].input.Key).toEqual({
					PK: "CLAIM#claim-123",
					SK: "PROJECT#proj-1",
				});
				expect(deleteCalls[1].args[0].input.Key).toEqual({
					PK: "CLAIM#claim-123",
					SK: "PROJECT#proj-2",
				});
				expect(deleteCalls[2].args[0].input.Key).toEqual({
					PK: "CLAIM#claim-123",
					SK: "PROJECT#proj-3",
				});
			});

			it("should handle claim with no projects", async () => {
				ddbMock.on(QueryCommand).resolves({ Items: [] });

				await deleteAllProjectLinksForClaim("claim-123");

				const deleteCalls = ddbMock.commandCalls(DeleteCommand);
				expect(deleteCalls).toHaveLength(0);
			});
		});

		describe("deleteAllClaimLinksForProject", () => {
			it("should delete all claim links for a project", async () => {
				ddbMock
					.on(QueryCommand)
					.resolves({
						Items: [
							{ PK: "CLAIM#claim-1", SK: "PROJECT#proj-123" },
							{ PK: "CLAIM#claim-2", SK: "PROJECT#proj-123" },
						],
					})
					.on(DeleteCommand)
					.resolves({});

				await deleteAllClaimLinksForProject("proj-123");

				const deleteCalls = ddbMock.commandCalls(DeleteCommand);
				expect(deleteCalls).toHaveLength(2);
				expect(deleteCalls[0].args[0].input.Key).toEqual({
					PK: "CLAIM#claim-1",
					SK: "PROJECT#proj-123",
				});
				expect(deleteCalls[1].args[0].input.Key).toEqual({
					PK: "CLAIM#claim-2",
					SK: "PROJECT#proj-123",
				});
			});

			it("should handle project with no claims", async () => {
				ddbMock.on(QueryCommand).resolves({ Items: [] });

				await deleteAllClaimLinksForProject("proj-123");

				const deleteCalls = ddbMock.commandCalls(DeleteCommand);
				expect(deleteCalls).toHaveLength(0);
			});
		});
	});
});
