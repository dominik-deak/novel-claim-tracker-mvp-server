export type ClaimStatus = "Draft" | "Submitted" | "Approved";

export interface ClaimPeriod {
	startDate: string;
	endDate: string;
}

export interface Claim {
	claimId: string;
	companyName: string;
	claimPeriod: ClaimPeriod;
	amount: number;
	status: ClaimStatus;

	// Phase 2 fields (null in Phase 1)
	userId: string | null;
	submittedBy: string | null;
	reviewedBy: string | null;
	submittedAt: string | null;
	reviewedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Project {
	projectId: string;
	name: string;
	description: string;

	// Phase 2 fields (null in Phase 1)
	userId: string | null;
	createdAt: string;
	updatedAt: string;
}

// Used for `GET /claims` and `GET /claims/:id` responses
export interface ClaimWithProjects extends Claim {
	projects: Project[];
}

// Used for `GET /projects/:id` response
export interface ProjectWithClaims extends Project {
	claims: Claim[];
}

/* Not needed in the end - only on the frontend */
// export interface CreateClaimInput {
// 	companyName: string;
// 	claimPeriod: ClaimPeriod;
// 	amount: number;
// 	projectIds?: string[]; // Optional array of project IDs to link
// }

// export interface UpdateClaimInput {
// 	status?: ClaimStatus;
// 	companyName?: string;
// 	claimPeriod?: ClaimPeriod;
// 	amount?: number;
// }

// export interface CreateProjectInput {
// 	name: string;
// 	description: string;
// }

// export interface UpdateProjectInput {
// 	name?: string;
// 	description?: string;
// }

// export interface LinkProjectsInput {
// 	projectIds: string[];
// }
