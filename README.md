# Stackwell

A multi-tenant SaaS backend boilerplate built with NestJS, MongoDB, and AWS. Demonstrates tenant isolation, JWT auth with RBAC, Stripe billing, per-tenant rate limiting, and serverless deployment — the pieces a real multi-tenant product needs beyond single-tenant CRUD.

**Status: in progress.** This README is updated as each module lands; see the module list below for current coverage.

## Why this project

Most backend portfolio projects are single-tenant CRUD apps. Stackwell instead tackles the problems that show up once you have to serve multiple customers from one deployment: keeping their data apart, scoping auth and rate limits per customer, and billing them — while staying deployable at zero infrastructure cost.

## Architecture

### Tenant isolation

Stackwell uses a **shared database, tenant-scoped by field** rather than a database-per-tenant model. Every tenant-owned document carries a `tenantId`, and a request-scoped middleware reads the tenant from the authenticated JWT and injects it into a base repository helper that every query goes through — so it's structurally hard to write a query that leaks across tenants.

This is a deliberate tradeoff:
- **Pro**: one connection pool, one schema to migrate, simpler ops, cheaper to run on a free-tier MongoDB Atlas cluster.
- **Con**: weaker isolation guarantee than DB-per-tenant (a bug in the scoping layer is a cross-tenant leak, not just a bug). Acceptable here because the middleware is centralized and unit-tested rather than left to each query author.

### Modules

| Module | Responsibility | Status |
|---|---|---|
| `config` | Zod-validated environment config, Mongoose connection | Done |
| `tenants` | Tenant model, signup/onboarding, plan & usage | Done |
| `auth` | JWT auth (access + refresh), guards | Done |
| `common` | Request-scoped tenant context + scoped query helper | Done |
| `docs` | Swagger UI at `/docs`, Bearer auth wired for protected routes | Done |
| `users` | User CRUD, invite flow, roles (owner/admin/member) | Planned |
| `billing` | Stripe checkout + webhooks, plan sync | Planned |
| `infra` (CDK) | Lambda + API Gateway deployment | Planned |

### Deployment model

Deploys to **AWS Lambda behind API Gateway** (via `serverless-http` wrapping the Nest app), not an always-on Fargate/EC2 instance — this keeps the deployment inside the AWS always-free tier instead of accruing an hourly compute cost. Infrastructure is defined as AWS CDK (TypeScript) under `infra/` but is **not deployed automatically** — `cdk deploy` is a manual, explicit step so nothing incurs cost without you choosing to run it.

## Local development

Requires Docker (for MongoDB + Redis) and Node 20+.

```bash
cp .env.example .env   # fill in JWT secrets, Stripe test keys
docker compose up -d   # starts MongoDB and Redis
npm install
npm run start:dev
```

Once running, browse and exercise the API at [http://localhost:3000/docs](http://localhost:3000/docs) (Swagger UI). For protected endpoints: call `/auth/login`, copy the `accessToken` from the response, click **Authorize** and paste it in, then any protected route (e.g. `/auth/me`) works directly from the UI.

## Testing

Built test-first (Red-Green-Refactor) per module.

```bash
npm run test        # unit tests
npm run test:e2e    # end-to-end tests
npm run test:cov    # coverage report (target: 80%+ on changed files)
```

## Cost notes

Everything here is designed to run at **$0**:
- MongoDB Atlas free tier (M0) or local Docker for dev.
- Redis via a free tier (e.g. Upstash) or local Docker for dev.
- Stripe in **test mode** — no real charges.
- AWS Lambda + API Gateway within the always-free monthly request/compute allowance.

Deploying (`cdk deploy`) is manual and optional; nothing here spins up paid infrastructure on its own.

## License

MIT
