/**
 * Raised when work crosses a tenant boundary — always a bug, never expected.
 * See docs/event-platform/multi-tenant-and-security.md.
 */
export class TenantScopeViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantScopeViolationError';
  }
}

/**
 * Structural guard: assert two companyIds match at a service boundary. Cheap to
 * call, and turns a silent cross-tenant leak into a loud failure.
 */
export function assertTenantScope(expected: string, actual: string, context: string): void {
  if (expected !== actual) {
    throw new TenantScopeViolationError(
      `Tenant scope violation in ${context}: expected company ${expected}, got ${actual}`,
    );
  }
}
