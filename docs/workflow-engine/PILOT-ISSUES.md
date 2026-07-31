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
| WE-001 | migration | Medium | `migrate-deploy.sh` post-verify would false-positive (block every deploy) | fresh DB `migrate deploy` then `migrate diff --exit-code` | exit 0 (no drift) | exit 2 — 32 pre-existing `DROP DEFAULT` (schema uses app-level `@default(uuid())` but migrations set DB `gen_random_uuid()`; 10 new-table, 22 pre-existing) + enum retypes | post-verify compared schema.prisma→DB, flagging Prisma's app-vs-DB default/enum noise; repo-wide, predates PR #7 | `migrate-deploy.sh` post-verify rewritten: (1) `migrate status` head-check (no failed/pending, false-positive-free) + (2) opt-in migrations→DB shadow diff. **Verified on throwaway DBs: OLD check exit=2, NEW check exit=0.** | **Verified** |
| WE-002 | unit-suite | Low (pre-existing, main) | `auth.controller.spec` fails — mock missing `assertNotLocked` | full `src` unit suite | green | `TypeError: this.loginLockout.assertNotLocked is not a function` (3 tests) | controller calls `assertNotLocked` but the spec's `loginLockout` mock only had record*; predates PR #7 (auth untouched by workflow-engine) | added `assertNotLocked: jest.fn()` to the 3 mocks → **src suite 709/709 green** | **Verified** |
| WE-003 | ops | Low | new `notification-dispatch` BullMQ queue not in shutdown drain list (`REGISTERED_QUEUES`) | inspect `queues.module.ts` | queue closed gracefully on SIGTERM | not in `REGISTERED_QUEUES` — but that list is already 3/10 (dunning-sweep, event-relay, etc. also absent), a pre-existing app-wide gap | jobs persist in Redis (at-least-once), so not lost — only not drained. Recommend a **separate ops PR** reconciling the whole `REGISTERED_QUEUES` list vs actual `registerQueue` calls | Open |

<!-- Add rows as issues are found (boot/smoke/E2E/soak/pilot). -->

## Validation runs (evidence)

**2026-07-30 — throwaway-DB migration smoke (safe; no staging/prod touched):**
- Created scratch DB `we_smoke_test`, ran full repo `prisma migrate deploy`.
- ✅ **Migration chain applies cleanly** on a fresh DB — all migrations incl. PR #7's 5 (`…140000/150000/160000/170000/180000`). *"All migrations have been successfully applied."*
- ✅ All **10 new tables present**; ✅ **RLS enabled + FORCED on all 10**.
- ⚠️ Post-verify drift (WE-001) — pre-existing, repo-wide, not a PR #7 structural issue.
- **Conclusion:** the migration *chain* is sound; **staging's failure is an environment problem (corrupted `_prisma_migrations`), not a repo problem.** Scratch DB dropped after; staging `.env` untouched.
- ❌ **Boot NOT run here:** `load-env.ts` uses `dotenv override:true`, so any boot from this checkout force-loads staging's `.env` → would hit staging DB/Redis. Boot must run on **deployed staging** (correct env), per the runbook. Not a code issue — expected behaviour.

## Notes
- Log the **environment** each issue was found in (staging/prod) in the Repro steps.
- Link the Fix commit SHA; a fix isn't `Verified` until re-run in the finding environment.
- Roll Critical/High issues into a short daily summary during the pilot.
