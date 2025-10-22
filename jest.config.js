export default {
  // Test environment
  testEnvironment: 'node',

  // File extensions to consider
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js', '**/__tests__/**/*.js'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8', // Use V8 for better performance

  // Files to collect coverage from
  collectCoverageFrom: [
    'lib/**/*.js',
    'bin/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
  ],

  // Coverage thresholds (satware® AI requirement: ≥80%)
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: [
    'text', // Console output
    'text-summary', // Brief summary
    'lcov', // For IDE integration
    'html', // HTML report
    'json-summary', // For CI/CD
  ],

  // Transform files (ES modules support)
  transform: {},
  extensionsToTreatAsEsm: ['.js'],

  // Module path aliases (if needed in future)
  moduleNameMapper: {},

  // Setup files
  setupFiles: [],
  setupFilesAfterEnv: [],

  // Test timeout (30 seconds)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Automatically clear mock calls and instances between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Detect open handles (helps identify async issues)
  detectOpenHandles: true,
  forceExit: false,

  // Error on deprecated API usage
  errorOnDeprecated: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Notify on test completion (optional)
  notify: false,
  notifyMode: 'failure-change',
};
