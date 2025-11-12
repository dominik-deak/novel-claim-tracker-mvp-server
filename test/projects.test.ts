import { handler as createHandler } from "../src/functions/projects/create";
import { handler as deleteHandler } from "../src/functions/projects/delete";
import { handler as getHandler } from "../src/functions/projects/get";
import { handler as listHandler } from "../src/functions/projects/list";
import { handler as updateHandler } from "../src/functions/projects/update";
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

describe("Projects API", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("CREATE /projects", () => {
		const validProjectData = {
			name: "Research Project Alpha",
			description: "AI/ML research for product optimization",
		};

		it("should create a project successfully", async () => {
			mockDb.saveProject.mockResolvedValue();

			const event = createPostEvent(validProjectData, "user-1");
			const result = await createHandler(event);

			expectSuccessResponse(result, 201);
			const body = parseResponseBody<{ project: typeof createMockProject }>(
				result,
			);

			expect(body.project).toMatchObject({
				projectId: "generated-id",
				name: "Research Project Alpha",
				description: "AI/ML research for product optimization",
				userId: "user-1",
			});
			expect(mockDb.saveProject).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId: "generated-id",
					name: "Research Project Alpha",
					userId: "user-1",
				}),
			);
		});

		it("should create project without userId when no auth header", async () => {
			mockDb.saveProject.mockResolvedValue();

			const event = createPostEvent(validProjectData);
			const result = await createHandler(event);

			expectSuccessResponse(result, 201);
			expect(mockDb.saveProject).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: null,
				}),
			);
		});

		it("should return validation error for missing name", async () => {
			const invalidData = {
				description: "Description only",
			};

			const event = createPostEvent(invalidData);
			const result = await createHandler(event);

			expectValidationError(result);
		});

		it("should return validation error for empty name", async () => {
			const invalidData = {
				name: "",
				description: "Valid description",
			};

			const event = createPostEvent(invalidData);
			const result = await createHandler(event);

			expectValidationError(result);
		});

		it("should handle database errors gracefully", async () => {
			mockDb.saveProject.mockRejectedValue(new Error("DB Error"));

			const event = createPostEvent(validProjectData);
			const result = await createHandler(event);

			expectErrorResponse(result, 500);
		});

		it("should accept project with minimal description", async () => {
			mockDb.saveProject.mockResolvedValue();

			const minimalData = {
				name: "Project Name",
				description: "A",
			};

			const event = createPostEvent(minimalData, "user-1");
			const result = await createHandler(event);

			expectSuccessResponse(result, 201);
		});
	});

	describe("LIST /projects", () => {
		it("should list all projects", async () => {
			const projects = [
				createMockProject({ projectId: "proj-1", userId: "user-1" }),
				createMockProject({ projectId: "proj-2", userId: "user-2" }),
			];
			mockDb.getAllProjects.mockResolvedValue(projects);

			const event = createGetEvent();
			const result = await listHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ projects: typeof projects }>(result);
			expect(body.projects).toHaveLength(2);
			expect(mockDb.getAllProjects).toHaveBeenCalled();
		});

		it("should filter projects by userId", async () => {
			const allProjects = [
				createMockProject({ projectId: "proj-1", userId: "user-1" }),
				createMockProject({ projectId: "proj-2", userId: "user-2" }),
				createMockProject({ projectId: "proj-3", userId: "user-1" }),
			];
			mockDb.getAllProjects.mockResolvedValue(allProjects);

			const event = createGetEvent(undefined, "user-1");
			const result = await listHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ projects: typeof allProjects }>(result);
			expect(body.projects).toHaveLength(2);
			expect(body.projects.every((p) => p.userId === "user-1")).toBe(true);
		});

		it("should return empty array when no projects exist", async () => {
			mockDb.getAllProjects.mockResolvedValue([]);

			const event = createGetEvent();
			const result = await listHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ projects: [] }>(result);
			expect(body.projects).toHaveLength(0);
		});

		it("should handle database errors", async () => {
			mockDb.getAllProjects.mockRejectedValue(new Error("DB Error"));

			const event = createGetEvent();
			const result = await listHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("GET /projects/:id", () => {
		it("should get a project by ID", async () => {
			const project = createMockProject({ projectId: "proj-123" });
			mockDb.getProject.mockResolvedValue(project);
			mockDb.getClaimsForProject.mockResolvedValue([]);

			const event = createGetByIdEvent("proj-123");
			const result = await getHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ project: typeof project }>(result);
			expect(body.project.projectId).toBe("proj-123");
			expect(mockDb.getProject).toHaveBeenCalledWith("proj-123");
		});

		it("should return 404 when project not found", async () => {
			mockDb.getProject.mockResolvedValue(null);

			const event = createGetByIdEvent("non-existent");
			const result = await getHandler(event);

			expectErrorResponse(
				result,
				404,
				"Project with ID non-existent not found",
			);
		});

		it("should include linked claims", async () => {
			const project = createMockProject();
			const claims = [createMockClaim(), createMockClaim()];
			mockDb.getProject.mockResolvedValue(project);
			mockDb.getClaimsForProject.mockResolvedValue(claims);

			const event = createGetByIdEvent("proj-123");
			const result = await getHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{
				project: { claims: typeof claims };
			}>(result);
			expect(body.project.claims).toHaveLength(2);
			expect(mockDb.getClaimsForProject).toHaveBeenCalledWith("proj-123");
		});

		it("should handle database errors", async () => {
			mockDb.getProject.mockRejectedValue(new Error("DB Error"));

			const event = createGetByIdEvent("proj-123");
			const result = await getHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("PATCH /projects/:id", () => {
		it("should update project name", async () => {
			const existingProject = createMockProject();
			const updatedProject = createMockProject({ name: "Updated Name" });
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.updateProject.mockResolvedValue(updatedProject);

			const event = createPatchEvent("proj-123", { name: "Updated Name" });
			const result = await updateHandler(event);

			expectSuccessResponse(result);
			const body = parseResponseBody<{ project: typeof updatedProject }>(
				result,
			);
			expect(body.project.name).toBe("Updated Name");
			expect(mockDb.updateProject).toHaveBeenCalledWith("proj-123", {
				name: "Updated Name",
			});
		});

		it("should update project description", async () => {
			const existingProject = createMockProject();
			const updatedProject = createMockProject({
				description: "New Description",
			});
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.updateProject.mockResolvedValue(updatedProject);

			const event = createPatchEvent("proj-123", {
				description: "New Description",
			});
			const result = await updateHandler(event);

			expectSuccessResponse(result);
			expect(mockDb.updateProject).toHaveBeenCalledWith("proj-123", {
				description: "New Description",
			});
		});

		it("should update both name and description", async () => {
			const existingProject = createMockProject();
			const updatedProject = createMockProject({
				name: "New Name",
				description: "New Description",
			});
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.updateProject.mockResolvedValue(updatedProject);

			const event = createPatchEvent("proj-123", {
				name: "New Name",
				description: "New Description",
			});
			const result = await updateHandler(event);

			expectSuccessResponse(result);
			expect(mockDb.updateProject).toHaveBeenCalledWith("proj-123", {
				name: "New Name",
				description: "New Description",
			});
		});

		it("should return 404 when project not found", async () => {
			mockDb.getProject.mockResolvedValue(null);

			const event = createPatchEvent("non-existent", { name: "New Name" });
			const result = await updateHandler(event);

			expectErrorResponse(result, 404);
		});

		it("should validate update data", async () => {
			const event = createPatchEvent("proj-123", { name: "" });
			const result = await updateHandler(event);

			expectValidationError(result);
		});

		it("should handle database errors", async () => {
			const existingProject = createMockProject();
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.updateProject.mockRejectedValue(new Error("DB Error"));

			const event = createPatchEvent("proj-123", { name: "New Name" });
			const result = await updateHandler(event);

			expectErrorResponse(result, 500);
		});
	});

	describe("DELETE /projects/:id", () => {
		it("should delete a project", async () => {
			const existingProject = createMockProject();
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.deleteProject.mockResolvedValue();
			mockDb.deleteAllClaimLinksForProject.mockResolvedValue();

			const event = createDeleteEvent("proj-123");
			const result = await deleteHandler(event);

			expect(result.statusCode).toBe(204);
			expect(mockDb.deleteProject).toHaveBeenCalledWith("proj-123");
			expect(mockDb.deleteAllClaimLinksForProject).toHaveBeenCalledWith(
				"proj-123",
			);
		});

		it("should return 404 when project not found", async () => {
			mockDb.getProject.mockResolvedValue(null);

			const event = createDeleteEvent("non-existent");
			const result = await deleteHandler(event);

			expectErrorResponse(result, 404);
		});

		it("should handle database errors during deletion", async () => {
			const existingProject = createMockProject();
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.deleteProject.mockRejectedValue(new Error("DB Error"));

			const event = createDeleteEvent("proj-123");
			const result = await deleteHandler(event);

			expectErrorResponse(result, 500);
		});

		it("should handle errors during claim link cleanup", async () => {
			const existingProject = createMockProject();
			mockDb.getProject.mockResolvedValue(existingProject);
			mockDb.deleteAllClaimLinksForProject.mockRejectedValue(
				new Error("Cleanup Error"),
			);

			const event = createDeleteEvent("proj-123");
			const result = await deleteHandler(event);

			expectErrorResponse(result, 500);
		});
	});
});
