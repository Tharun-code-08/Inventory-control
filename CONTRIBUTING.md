# Contributing to SoftdigitIMS

Thank you for contributing to SoftdigitIMS.

## Before you start

- Use Node.js 22.19+.
- Install dependencies with `npm install` (npm workspaces; commit `package-lock.json` changes).
- Never commit secrets, `.env` files, generated build output, database dumps, or production data.
- Read `README.md`, [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and [`docs/RUNBOOK.md`](docs/RUNBOOK.md) before making infrastructure or production-facing changes.

## Branches

`main` is the only long-lived branch. It is always deployable: every merge to `main`
that passes CI is deployed to production automatically.

Work happens on short-lived branches cut from `main`, named by the kind of change:

| Prefix | Use for |
| --- | --- |
| `feat/` | New behaviour (`feat/eway-bill-json-export`) |
| `fix/` | Bug fixes (`fix/po-receipt-limit`) |
| `chore/` | Dependencies, tooling, CI, cleanup (`chore/bump-prisma`) |
| `docs/` | Documentation only (`docs/backup-guide`) |

Dependabot opens its own `dependabot/...` branches. Pull requests are **squash-merged**,
and the branch is deleted after merging, so the repository only carries branches with
open work.

## Development workflow

1. Create a branch from `main` (see above).
2. Make the smallest focused change that solves the problem.
3. Add or update tests for behavior changes.
4. Run the relevant lint, typecheck, build, and test commands locally.
5. Open a pull request with a clear description of the problem, solution, testing, and deployment impact.

## Pull requests

PRs should include:

- **Problem:** what is wrong or missing.
- **Solution:** what changed and why.
- **Validation:** commands/tests run and their results.
- **Risk:** migrations, permissions, data changes, external integrations, or deployment concerns.
- **Rollback:** how the change can be safely reverted when operationally relevant.

Keep unrelated refactors out of feature or fix PRs. Prefer reviewable commits and clear commit messages.

## Database and migrations

- Production schema changes must use Prisma migrations.
- Do not use `prisma db push` against production.
- Treat destructive schema changes as high-risk and document their data impact and rollback strategy.
- Test migrations against a fresh database when possible.

## Security

Report suspected vulnerabilities privately rather than opening a public issue with exploit details. Never include credentials, tokens, customer data, or other sensitive information in commits or issues.

## Code quality

Prefer existing project patterns over introducing new abstractions. Keep tenant isolation, authorization, stock integrity, auditability, and document immutability intact when modifying business logic.

## License

SoftdigitIMS is licensed under the [GNU AGPL v3.0](LICENSE). By submitting a pull
request you agree that your contribution is licensed under the same terms.
