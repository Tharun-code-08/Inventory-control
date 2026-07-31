# Workflow Engine — Pilot & Validation Issues Log

Single source of truth for everything found during **boot → smoke → E2E → soak → pilot**.
Keep this **separate from the feature backlog** — it records what was discovered and
resolved before promoting `workflow-engine-v1.0.0-rc1 → v1.0.0`. One row per issue.

**Severity:** Critical (blocks release / data loss / customer-facing failure) ·
High (breaks a core flow, workaround exists) · Medium (degraded, non-blocking) ·
Low (cosmetic / nice-to-have).

**Verification status:** Open → Fixing → Fixed → Verified (re-run in the same env that found it).

**Phase gate:** no promotion to `v1.0.0` while any Critical/High is not `Verified`.

---

| ID | Phase | Severity | Summary | Repro steps | Expected | Actual | Root cause | Fix commit | Status |
|----|-------|----------|---------|-------------|----------|--------|------------|-----------|--------|
| WE-001 | boot | — | _(template row — delete)_ | 1. `pm2 start` … | app boots, no DI errors | | | | Open |

<!--
Add rows as issues are found. Example of a filled row:

| WE-002 | boot | Critical | DispatchProcessor fails to resolve CustomerDispatchService | deploy + start api | worker starts | Nest error: Nest can't resolve dependencies of DispatchProcessor | missing provider in workflow-engine.module | abc1234 | Verified |
-->

## Notes
- Log the **environment** each issue was found in (staging/prod) in the Repro steps.
- Link the Fix commit SHA; a fix isn't `Verified` until re-run in the finding environment.
- Roll Critical/High issues into a short daily summary during the pilot.
