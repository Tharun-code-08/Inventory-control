# Security Policy

## Supported versions

Security fixes are prioritized for the latest version on `main`.

## Reporting a vulnerability

Please do not disclose suspected vulnerabilities publicly in GitHub issues or pull requests.

When a private security reporting channel is available for this repository, use it first. Include:

- affected component or endpoint
- reproducible steps
- expected and actual behavior
- potential impact
- relevant logs or screenshots with secrets and personal data removed

Do not include passwords, API keys, tokens, database credentials, customer records, or other sensitive data.

## Security expectations

SoftdigitIMS is a multi-tenant ERP and inventory system. Changes must preserve:

- tenant/shop isolation
- role-based authorization
- secure authentication and session handling
- auditability of sensitive operations
- protection of secrets and production configuration
- safe handling of uploaded files and generated documents
