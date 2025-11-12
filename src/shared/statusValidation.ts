import type { ClaimStatus } from "./types";

const VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
	Draft: ["Submitted", "Draft"],
	Submitted: ["Approved", "Draft"],
	Approved: ["Draft"],
};

export function validateStatusTransition(
	currentStatus: ClaimStatus,
	newStatus: ClaimStatus,
): void {
	if (currentStatus === newStatus) {
		return;
	}
	const allowedTransitions = VALID_TRANSITIONS[currentStatus];
	if (!allowedTransitions.includes(newStatus)) {
		throw new Error(
			`Invalid status transition: Cannot change from "${currentStatus}" to "${newStatus}"`,
		);
	}
}

export function getAllowedNextStatuses(
	currentStatus: ClaimStatus,
): ClaimStatus[] {
	return VALID_TRANSITIONS[currentStatus].filter(
		(status) => status !== currentStatus,
	);
}
