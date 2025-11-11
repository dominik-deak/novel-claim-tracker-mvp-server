import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import {
	ClaimQuerySchema,
	CreateClaimSchema,
	CreateProjectSchema,
	LinkProjectsSchema,
	UpdateClaimSchema,
	UpdateProjectSchema,
} from "../shared/schemas";
import type {
	Claim,
	ClaimWithProjects,
	Project,
	ProjectWithClaims,
} from "../shared/types";
import { generateId, getCurrentTimestamp } from "../shared/utils";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const claims = new Map<string, Claim>();
const projects = new Map<string, Project>();
const claimProjects = new Map<string, Set<string>>();

app.post("/claims", (req, res) => {
	try {
		const validated = CreateClaimSchema.parse(req.body);

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

		claims.set(claim.claimId, claim);

		if (validated.projectIds && validated.projectIds.length > 0) {
			for (const projectId of validated.projectIds) {
				if (!projects.has(projectId)) {
					return res
						.status(404)
						.json({ error: `Project with ID ${projectId} not found` });
				}

				if (!claimProjects.has(claim.claimId)) {
					claimProjects.set(claim.claimId, new Set());
				}
				claimProjects.get(claim.claimId)?.add(projectId);
			}
		}

		return res.status(201).json({ claim });
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				error: "Validation failed",
				details: error.issues,
			});
		}
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/claims", (req, res) => {
	try {
		const validated = ClaimQuerySchema.parse({
			status: req.query.status,
		});

		let claimsArray = Array.from(claims.values());

		if (validated.status) {
			claimsArray = claimsArray.filter(
				(claim) => claim.status === validated.status,
			);
		}

		const claimsWithProjects: ClaimWithProjects[] = claimsArray.map((claim) => {
			const projectIds = claimProjects.get(claim.claimId) || new Set();
			const linkedProjects = Array.from(projectIds)
				.map((pid) => projects.get(pid))
				.filter((p): p is Project => p !== undefined);

			return {
				...claim,
				projects: linkedProjects,
			};
		});

		return res.json({ claims: claimsWithProjects });
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				error: "Validation failed",
				details: error.issues,
			});
		}
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/claims/:id", (req, res) => {
	const { id } = req.params;

	const claim = claims.get(id);
	if (!claim) {
		return res.status(404).json({ error: `Claim with ID ${id} not found` });
	}

	const projectIds = claimProjects.get(id) || new Set();
	const linkedProjects = Array.from(projectIds)
		.map((pid) => projects.get(pid))
		.filter((p): p is Project => p !== undefined);

	const claimWithProjects: ClaimWithProjects = {
		...claim,
		projects: linkedProjects,
	};

	return res.json({ claim: claimWithProjects });
});

app.patch("/claims/:id", (req, res) => {
	try {
		const { id } = req.params;

		const claim = claims.get(id);
		if (!claim) {
			return res.status(404).json({ error: `Claim with ID ${id} not found` });
		}

		const validated = UpdateClaimSchema.parse(req.body);

		const updatedClaim: Claim = {
			...claim,
			...validated,
			updatedAt: getCurrentTimestamp(),
		};

		claims.set(id, updatedClaim);

		return res.json({ claim: updatedClaim });
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				error: "Validation failed",
				details: error.issues,
			});
		}
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.delete("/claims/:id", (req, res) => {
	const { id } = req.params;

	const claim = claims.get(id);
	if (!claim) {
		return res.status(404).json({ error: `Claim with ID ${id} not found` });
	}

	claims.delete(id);
	claimProjects.delete(id);

	return res.status(204).json({ message: "Claim deleted successfully" });
});

app.post("/claims/:id/projects", (req, res) => {
	try {
		const { id } = req.params;

		const claim = claims.get(id);
		if (!claim) {
			return res.status(404).json({ error: `Claim with ID ${id} not found` });
		}

		const validated = LinkProjectsSchema.parse(req.body);

		for (const projectId of validated.projectIds) {
			if (!projects.has(projectId)) {
				return res
					.status(404)
					.json({ error: `Project with ID ${projectId} not found` });
			}

			if (!claimProjects.has(id)) {
				claimProjects.set(id, new Set());
			}
			claimProjects.get(id)?.add(projectId);
		}

		return res.json({ message: "Projects linked successfully" });
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				error: "Validation failed",
				details: error.issues,
			});
		}
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.delete("/claims/:id/projects/:projectId", (req, res) => {
	const { id, projectId } = req.params;

	const claim = claims.get(id);
	if (!claim) {
		return res.status(404).json({ error: `Claim with ID ${id} not found` });
	}

	const project = projects.get(projectId);
	if (!project) {
		return res
			.status(404)
			.json({ error: `Project with ID ${projectId} not found` });
	}

	claimProjects.get(id)?.delete(projectId);

	return res.json({ message: "Project unlinked successfully" });
});

app.post("/projects", (req, res) => {
	try {
		const validated = CreateProjectSchema.parse(req.body);

		const now = getCurrentTimestamp();
		const project: Project = {
			projectId: generateId(),
			name: validated.name,
			description: validated.description,
			userId: null,
			createdAt: now,
			updatedAt: now,
		};

		projects.set(project.projectId, project);

		return res.status(201).json({ project });
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				error: "Validation failed",
				details: error.issues,
			});
		}
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.get("/projects", (_req, res) => {
	const projectsArray = Array.from(projects.values());
	return res.json({ projects: projectsArray });
});

app.get("/projects/:id", (req, res) => {
	const { id } = req.params;

	const project = projects.get(id);
	if (!project) {
		return res.status(404).json({ error: `Project with ID ${id} not found` });
	}

	const linkedClaims: Claim[] = [];
	for (const [claimId, projectIds] of claimProjects.entries()) {
		if (projectIds.has(id)) {
			const claim = claims.get(claimId);
			if (claim) {
				linkedClaims.push(claim);
			}
		}
	}

	const projectWithClaims: ProjectWithClaims = {
		...project,
		claims: linkedClaims,
	};

	return res.json({ project: projectWithClaims });
});

app.patch("/projects/:id", (req, res) => {
	try {
		const { id } = req.params;

		const project = projects.get(id);
		if (!project) {
			return res.status(404).json({ error: `Project with ID ${id} not found` });
		}

		const validated = UpdateProjectSchema.parse(req.body);

		const updatedProject: Project = {
			...project,
			...validated,
			updatedAt: getCurrentTimestamp(),
		};

		projects.set(id, updatedProject);

		return res.json({ project: updatedProject });
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				error: "Validation failed",
				details: error.issues,
			});
		}
		return res.status(500).json({ error: "Internal server error" });
	}
});

app.delete("/projects/:id", (req, res) => {
	const { id } = req.params;

	const project = projects.get(id);
	if (!project) {
		return res.status(404).json({ error: `Project with ID ${id} not found` });
	}

	projects.delete(id);

	for (const projectIds of claimProjects.values()) {
		projectIds.delete(id);
	}

	return res.status(204).json({ message: "Project deleted successfully" });
});

app.listen(PORT, () => {
	console.log(`Mock server running on http://localhost:${PORT}`);
});
