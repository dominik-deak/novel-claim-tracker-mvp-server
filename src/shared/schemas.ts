import { z } from "zod";

export const ClaimStatusSchema = z.enum(["Draft", "Submitted", "Approved"]);

const ISO8601DateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in ISO 8601 format (YYYY-MM-DD)");

export const ClaimPeriodSchema = z
	.object({
		startDate: ISO8601DateSchema,
		endDate: ISO8601DateSchema,
	})
	.refine((data) => new Date(data.startDate) < new Date(data.endDate), {
		message: "Start date must be before end date",
		path: ["startDate"],
	});

const UUIDSchema = z.uuid("Must be a valid UUID");

export const CreateClaimSchema = z.object({
	companyName: z
		.string()
		.min(1, "Company name is required")
		.max(200, "Company name must be 200 characters or less"),

	claimPeriod: ClaimPeriodSchema,

	amount: z
		.number()
		.int("Amount must be an integer (pence)")
		.positive("Amount must be positive"),

	projectIds: z.array(UUIDSchema).optional().default([]),
});

export const UpdateClaimSchema = z.object({
	status: ClaimStatusSchema.optional(),

	companyName: z
		.string()
		.min(1, "Company name is required")
		.max(200, "Company name must be 200 characters or less")
		.optional(),

	claimPeriod: ClaimPeriodSchema.optional(),

	amount: z
		.number()
		.int("Amount must be an integer (pence)")
		.positive("Amount must be positive")
		.optional(),
});

export const CreateProjectSchema = z.object({
	name: z
		.string()
		.min(1, "Project name is required")
		.max(200, "Project name must be 200 characters or less"),

	description: z
		.string()
		.min(1, "Project description is required")
		.max(1000, "Project description must be 1000 characters or less"),
});

export const UpdateProjectSchema = z.object({
	name: z
		.string()
		.min(1, "Project name is required")
		.max(200, "Project name must be 200 characters or less")
		.optional(),

	description: z
		.string()
		.min(1, "Project description is required")
		.max(1000, "Project description must be 1000 characters or less")
		.optional(),
});

export const LinkProjectsSchema = z.object({
	projectIds: z.array(UUIDSchema).min(1, "At least one project ID is required"),
});

export const ClaimQuerySchema = z.object({
	status: ClaimStatusSchema.optional(),
});
