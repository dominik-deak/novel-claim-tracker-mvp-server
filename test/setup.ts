// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Suppress console output during tests
beforeAll(() => {
	console.error = jest.fn();
	console.warn = jest.fn();
	console.log = jest.fn();
});

// Restore console methods after all tests
afterAll(() => {
	console.error = originalConsoleError;
	console.warn = originalConsoleWarn;
	console.log = originalConsoleLog;
});
