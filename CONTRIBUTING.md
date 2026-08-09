# Contributing to SoftdigitIMS

Thank you for contributing to SoftdigitIMS.

## Before you start

- Use Node.js 20+.
- Install dependencies with `npm install` (or the repository's supported pnpm workflow).
- Never commit secrets, `.env` files, generated build output, database dumps, or production data.
- Read `README.md`, `DEPLOYMENT.md`, and `RUNBOOK.md` before making infrastructure or production-facing changes.

## Development workflow

1. Create a feature branch from `main`.
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
