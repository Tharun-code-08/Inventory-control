/* eslint-disable */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  // Mirror the tsconfig "@/*" -> "src/*" path alias so specs that import
  // modules using the alias resolve under jest (ts-jest doesn't read paths).
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.spec.ts'],
  // The e2e suite has its own config (test/jest-e2e.json) and runs separately.
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '\\.e2e-spec\\.ts$'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: { isolatedModules: true, paths: { '@/*': ['src/*'] } } }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/dto/**',
    '!src/**/*.controller.ts',
    '!src/main.ts',
    '!src/load-env.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  // Floor thresholds — start small and ratchet up as the suite grows.
  // Today the audited critical paths (stock, payments, invoices, sales-orders,
  // goods-receipts, exception filter, csrf guard) are well-covered. The global
  // floor is intentionally low so the suite passes for now; raise it whenever
  // a new module gets a unit-test pass.
  coverageThreshold: {
    global: {
      statements: 18,
      branches: 14,
      functions: 12,
      lines: 18,
    },
    // Hard guards on the modules the audit explicitly hardened, so a regression
    // that drops their coverage trips CI.
    './src/common/utils/money.ts': {
      statements: 90,
      branches: 80,
      lines: 90,
    },
    './src/common/utils/date-guards.ts': {
      statements: 90,
      branches: 80,
      lines: 90,
    },
    './src/common/utils/pagination.ts': {
      statements: 90,
      branches: 75,
      lines: 90,
    },
    './src/common/utils/idempotency.ts': {
      statements: 90,
      branches: 75,
      lines: 90,
    },
    './src/common/guards/csrf.guard.ts': {
      statements: 80,
      branches: 70,
      lines: 80,
    },
  },
};
