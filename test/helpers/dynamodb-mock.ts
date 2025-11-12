import type { Claim, Project } from "../../src/shared/types";

export function createMockClaim(overrides?: Partial<Claim>): Claim {
	return {
		claimId: "test-claim-id",
		companyName: "Test Company",
		claimPeriod: {
			startDate: "2024-01-01",
			endDate: "2024-12-31",
		},
		amount: 100000,
		status: "Draft",
		userId: "user-1",
		submittedBy: null,
		reviewedBy: null,
		submittedAt: null,
		reviewedAt: null,
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	};
}

export function createMockProject(overrides?: Partial<Project>): Project {
	return {
		projectId: "test-project-id",
		name: "Test Project",
		description: "Test Description",
		userId: "user-1",
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	};
}
