import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
	ScanCommand,
	UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Claim, Project } from "./types";
import { validateEnvVars } from "./utils";

validateEnvVars(["CLAIMS_TABLE", "PROJECTS_TABLE", "CLAIM_PROJECTS_TABLE"]);

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_NAMES = {
	CLAIMS: process.env.CLAIMS_TABLE || "",
	PROJECTS: process.env.PROJECTS_TABLE || "",
	CLAIM_PROJECTS: process.env.CLAIM_PROJECTS_TABLE || "",
};

const KEY_PREFIXES = {
	CLAIM: "CLAIM#",
	PROJECT: "PROJECT#",
	METADATA: "METADATA",
} as const;

export async function saveClaim(claim: Claim): Promise<void> {
	await docClient.send(
		new PutCommand({
			TableName: TABLE_NAMES.CLAIMS,
			Item: {
				PK: `${KEY_PREFIXES.CLAIM}${claim.claimId}`,
				SK: KEY_PREFIXES.METADATA,
				...claim,
			},
		}),
	);
}

export async function getClaim(claimId: string): Promise<Claim | null> {
	const result = await docClient.send(
		new GetCommand({
			TableName: TABLE_NAMES.CLAIMS,
			Key: {
				PK: `${KEY_PREFIXES.CLAIM}${claimId}`,
				SK: KEY_PREFIXES.METADATA,
			},
		}),
	);

	if (!result.Item) {
		return null;
	}

	// biome-ignore lint/correctness/noUnusedVariables: PK and SK are intentionally destructured to remove them from the returned object
	const { PK, SK, ...claim } = result.Item;
	return claim as Claim;
}

export async function getAllClaims(status?: string): Promise<Claim[]> {
	const result = await docClient.send(
		new ScanCommand({
			TableName: TABLE_NAMES.CLAIMS,
			FilterExpression: status ? "#status = :status" : undefined,
			ExpressionAttributeNames: status ? { "#status": "status" } : undefined,
			ExpressionAttributeValues: status ? { ":status": status } : undefined,
		}),
	);

	return (result.Items || []).map(({ PK, SK, ...claim }) => claim as Claim);
}

export async function updateClaim(
	claimId: string,
	updates: Partial<Claim>,
): Promise<Claim> {
	const updateExpressionParts: string[] = [];
	const expressionAttributeNames: Record<string, string> = {};
	const expressionAttributeValues: Record<string, unknown> = {};

	updates.updatedAt = new Date().toISOString();

	Object.entries(updates).forEach(([key, value], index) => {
		const attrName = `#attr${index}`;
		const attrValue = `:val${index}`;
		updateExpressionParts.push(`${attrName} = ${attrValue}`);
		expressionAttributeNames[attrName] = key;
		expressionAttributeValues[attrValue] = value;
	});

	const result = await docClient.send(
		new UpdateCommand({
			TableName: TABLE_NAMES.CLAIMS,
			Key: {
				PK: `${KEY_PREFIXES.CLAIM}${claimId}`,
				SK: KEY_PREFIXES.METADATA,
			},
			UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues,
			ReturnValues: "ALL_NEW",
		}),
	);

	if (!result.Attributes) {
		throw new Error("Failed to update claim");
	}

	// biome-ignore lint/correctness/noUnusedVariables: PK and SK are intentionally destructured to remove them from the returned object
	const { PK, SK, ...claim } = result.Attributes;
	return claim as Claim;
}

export async function deleteClaim(claimId: string): Promise<void> {
	await docClient.send(
		new DeleteCommand({
			TableName: TABLE_NAMES.CLAIMS,
			Key: {
				PK: `${KEY_PREFIXES.CLAIM}${claimId}`,
				SK: KEY_PREFIXES.METADATA,
			},
		}),
	);
}

export async function saveProject(project: Project): Promise<void> {
	await docClient.send(
		new PutCommand({
			TableName: TABLE_NAMES.PROJECTS,
			Item: {
				PK: `${KEY_PREFIXES.PROJECT}${project.projectId}`,
				SK: KEY_PREFIXES.METADATA,
				...project,
			},
		}),
	);
}

export async function getProject(projectId: string): Promise<Project | null> {
	const result = await docClient.send(
		new GetCommand({
			TableName: TABLE_NAMES.PROJECTS,
			Key: {
				PK: `${KEY_PREFIXES.PROJECT}${projectId}`,
				SK: KEY_PREFIXES.METADATA,
			},
		}),
	);

	if (!result.Item) {
		return null;
	}

	// biome-ignore lint/correctness/noUnusedVariables: PK and SK are intentionally destructured to remove them from the returned object
	const { PK, SK, ...project } = result.Item;
	return project as Project;
}

export async function getAllProjects(): Promise<Project[]> {
	const result = await docClient.send(
		new ScanCommand({
			TableName: TABLE_NAMES.PROJECTS,
		}),
	);

	return (result.Items || []).map(
		({ PK, SK, ...project }) => project as Project,
	);
}

export async function updateProject(
	projectId: string,
	updates: Partial<Project>,
): Promise<Project> {
	const updateExpressionParts: string[] = [];
	const expressionAttributeNames: Record<string, string> = {};
	const expressionAttributeValues: Record<string, unknown> = {};

	updates.updatedAt = new Date().toISOString();

	Object.entries(updates).forEach(([key, value], index) => {
		const attrName = `#attr${index}`;
		const attrValue = `:val${index}`;
		updateExpressionParts.push(`${attrName} = ${attrValue}`);
		expressionAttributeNames[attrName] = key;
		expressionAttributeValues[attrValue] = value;
	});

	const result = await docClient.send(
		new UpdateCommand({
			TableName: TABLE_NAMES.PROJECTS,
			Key: {
				PK: `${KEY_PREFIXES.PROJECT}${projectId}`,
				SK: KEY_PREFIXES.METADATA,
			},
			UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues,
			ReturnValues: "ALL_NEW",
		}),
	);

	if (!result.Attributes) {
		throw new Error("Failed to update project");
	}

	// biome-ignore lint/correctness/noUnusedVariables: PK and SK are intentionally destructured to remove them from the returned object
	const { PK, SK, ...project } = result.Attributes;
	return project as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
	await docClient.send(
		new DeleteCommand({
			TableName: TABLE_NAMES.PROJECTS,
			Key: {
				PK: `${KEY_PREFIXES.PROJECT}${projectId}`,
				SK: KEY_PREFIXES.METADATA,
			},
		}),
	);
}

export async function linkProjectToClaim(
	claimId: string,
	projectId: string,
): Promise<void> {
	await docClient.send(
		new PutCommand({
			TableName: TABLE_NAMES.CLAIM_PROJECTS,
			Item: {
				PK: `${KEY_PREFIXES.CLAIM}${claimId}`,
				SK: `${KEY_PREFIXES.PROJECT}${projectId}`,
				addedAt: new Date().toISOString(),
			},
		}),
	);
}

export async function unlinkProjectFromClaim(
	claimId: string,
	projectId: string,
): Promise<void> {
	await docClient.send(
		new DeleteCommand({
			TableName: TABLE_NAMES.CLAIM_PROJECTS,
			Key: {
				PK: `${KEY_PREFIXES.CLAIM}${claimId}`,
				SK: `${KEY_PREFIXES.PROJECT}${projectId}`,
			},
		}),
	);
}

export async function getProjectIdsForClaim(
	claimId: string,
): Promise<string[]> {
	const result = await docClient.send(
		new QueryCommand({
			TableName: TABLE_NAMES.CLAIM_PROJECTS,
			KeyConditionExpression: "PK = :pk",
			ExpressionAttributeValues: {
				":pk": `${KEY_PREFIXES.CLAIM}${claimId}`,
			},
		}),
	);

	return (result.Items || []).map((item) =>
		item.SK.replace(KEY_PREFIXES.PROJECT, ""),
	);
}

// Uses Global Secondary Index for reverse lookup - makes it faster
// SK becomes the query key (partition key in the index)
// PK becomes the sort key in the index
export async function getClaimIdsForProject(
	projectId: string,
): Promise<string[]> {
	const result = await docClient.send(
		new QueryCommand({
			TableName: TABLE_NAMES.CLAIM_PROJECTS,
			IndexName: "projectId-index",
			KeyConditionExpression: "SK = :sk",
			ExpressionAttributeValues: {
				":sk": `${KEY_PREFIXES.PROJECT}${projectId}`,
			},
		}),
	);

	return (result.Items || []).map((item) =>
		item.PK.replace(KEY_PREFIXES.CLAIM, ""),
	);
}

export async function getProjectsForClaim(claimId: string): Promise<Project[]> {
	const projectIds = await getProjectIdsForClaim(claimId);
	const projectPromises = projectIds.map((projectId) => getProject(projectId));
	const projectResults = await Promise.allSettled(projectPromises);

	const failedResults = projectResults.filter((r) => r.status === "rejected");
	if (failedResults.length > 0) {
		console.error(
			`Failed to fetch ${failedResults.length} projects for claim ${claimId}`,
		);
		for (const result of failedResults) {
			if (result.status === "rejected") {
				console.error("Project fetch error:", result.reason);
			}
		}
	}

	return projectResults
		.filter(
			(result): result is PromiseFulfilledResult<Project> =>
				result.status === "fulfilled" && result.value !== null,
		)
		.map((result) => result.value);
}

export async function getClaimsForProject(projectId: string): Promise<Claim[]> {
	const claimIds = await getClaimIdsForProject(projectId);
	const claimPromises = claimIds.map((claimId) => getClaim(claimId));
	const claimResults = await Promise.allSettled(claimPromises);

	const failedResults = claimResults.filter((r) => r.status === "rejected");
	if (failedResults.length > 0) {
		console.error(
			`Failed to fetch ${failedResults.length} claims for project ${projectId}`,
		);
		for (const result of failedResults) {
			if (result.status === "rejected") {
				console.error("Claim fetch error:", result.reason);
			}
		}
	}

	return claimResults
		.filter(
			(result): result is PromiseFulfilledResult<Claim> =>
				result.status === "fulfilled" && result.value !== null,
		)
		.map((result) => result.value);
}

export async function deleteAllProjectLinksForClaim(
	claimId: string,
): Promise<void> {
	const projectIds = await getProjectIdsForClaim(claimId);

	for (const projectId of projectIds) {
		await unlinkProjectFromClaim(claimId, projectId);
	}
}

export async function deleteAllClaimLinksForProject(
	projectId: string,
): Promise<void> {
	const claimIds = await getClaimIdsForProject(projectId);

	for (const claimId of claimIds) {
		await unlinkProjectFromClaim(claimId, projectId);
	}
}
