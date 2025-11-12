/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/test"],
	testMatch: ["**/*.test.ts"],
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/mock-server/**"],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
	verbose: true,
	// Configure ts-jest transformer for TypeScript files
	// Matches .ts and .tsx files and uses ts-jest to compile them
	// ignoreCodes suppresses TS151002 warning about hybrid module kind
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				diagnostics: {
					ignoreCodes: [151002],
				},
			},
		],
	},
};
