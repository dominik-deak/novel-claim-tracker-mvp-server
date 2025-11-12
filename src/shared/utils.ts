import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
	return uuidv4();
}

export function getCurrentTimestamp(): string {
	return new Date().toISOString();
}

export function formatAmount(pence: number): string {
	const pounds = pence / 100;
	return new Intl.NumberFormat("en-GB", {
		style: "currency",
		currency: "GBP",
	}).format(pounds);
}

export function parseAmount(pounds: number): number {
	return Math.round(pounds * 100);
}

export function isValidDate(dateString: string): boolean {
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(dateString)) {
		return false;
	}

	const date = new Date(dateString);
	return !Number.isNaN(date.getTime());
}

export function formatDate(isoDate: string): string {
	const date = new Date(isoDate);
	return new Intl.DateTimeFormat("en-GB").format(date);
}

export function formatDateRange(startDate: string, endDate: string): string {
	return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function isPastDate(isoDate: string): boolean {
	const date = new Date(isoDate);
	const now = new Date();
	return date < now;
}

export function calculatePeriodDays(
	startDate: string,
	endDate: string,
): number {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const diffTime = Math.abs(end.getTime() - start.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays;
}

/**
 * Safely parse JSON body from API Gateway event
 * @param body - Request body string (may be null or undefined)
 * @returns Parsed object or empty object if invalid
 * @example
 * const data = parseRequestBody(event.body);
 */
export function parseRequestBody(body: string | null | undefined): unknown {
	if (!body) {
		return {};
	}
	try {
		return JSON.parse(body);
	} catch {
		return {};
	}
}

/**
 * Extract path parameter from API Gateway event
 * @param event - API Gateway event
 * @param paramName - Name of the path parameter
 * @returns Parameter value or null if not found
 * @example
 * const claimId = getPathParameter(event, 'id');
 */
export function getPathParameter(
	event: { pathParameters?: Record<string, string | undefined> | null },
	paramName: string,
): string | null {
	return event.pathParameters?.[paramName] || null;
}

/**
 * Extract query parameter from API Gateway event
 * @param event - API Gateway event
 * @param paramName - Name of the query parameter
 * @returns Parameter value or null if not found
 * @example
 * const status = getQueryParameter(event, 'status');
 */
export function getQueryParameter(
	event: { queryStringParameters?: Record<string, string | undefined> | null },
	paramName: string,
): string | null {
	return event.queryStringParameters?.[paramName] ?? null;
}

export function validateEnvVars(requiredVars: string[]): void {
	const missing = requiredVars.filter((varName) => !process.env[varName]);
	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(", ")}`,
		);
	}
}
