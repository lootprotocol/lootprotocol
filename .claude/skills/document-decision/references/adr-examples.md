# ADR Examples

## Example 1: ORM Choice

```markdown
# 0001. Use pg (node-postgres) Instead of Prisma

**Date**: 2026-02-24
**Status**: Accepted

## Context

The Loot Protocol backend needs a database access layer for PostgreSQL. The two main options in the TypeScript ecosystem are Prisma (full ORM with schema-first design, migrations, and generated client) and pg (raw PostgreSQL driver with parameterized queries).

The project has 5 tables with straightforward relationships and uses PostgreSQL-specific features like generated tsvector columns for full-text search.

## Decision

Use `pg` (node-postgres) with handwritten SQL queries organized in typed query functions.

## Alternatives Considered

- **Prisma**: Full ORM with schema management, generated types, and migration system. Rejected because: (1) the generated tsvector column is not natively supported by Prisma's schema, requiring raw SQL workarounds, (2) the overhead of the Prisma engine binary adds container size and cold start time in ECS, (3) for 5 tables the schema-first workflow adds complexity without proportional benefit.

- **Drizzle ORM**: TypeScript-first ORM with SQL-like syntax. Rejected because: while lighter than Prisma, it is still an abstraction over SQL that the team must learn, and the direct SQL approach gives full control over query optimization.

## Consequences

- **Positive**: Full control over SQL queries, no ORM overhead, direct use of PostgreSQL features (tsvector, window functions, CTEs), smaller Docker image
- **Negative**: Must write and maintain SQL manually, must handle snake_case to camelCase mapping ourselves, no automatic migration generation
- **Neutral**: TypeScript types for query results must be defined manually (same effort as Prisma's model definition, just in a different place)
```

---

## Example 2: Authentication Strategy

```markdown
# 0002. JWT in HTTP-Only Cookies for Web, Bearer Tokens for CLI

**Date**: 2026-02-24
**Status**: Accepted

## Context

Loot Protocol has three clients: web browser, CLI tool, and in-agent skill. All need to authenticate against the same API. The API uses Amazon Cognito for identity management with GitHub as the OAuth provider.

The question is how each client stores and transmits authentication tokens.

## Decision

Web clients store Cognito JWTs in HTTP-only secure cookies. CLI and in-agent clients use Bearer token in the Authorization header, with tokens stored in `~/.lootprotocol/config.json`.

## Alternatives Considered

- **Bearer tokens for all clients**: Simpler implementation (one auth path). Rejected because: storing tokens in localStorage/sessionStorage exposes them to XSS attacks in the web client. HTTP-only cookies are immune to JavaScript-based token theft.

- **Session-based auth with server-side sessions**: Traditional session management. Rejected because: requires server-side session storage (another infrastructure component), complicates horizontal scaling in ECS, and does not work well for CLI/API clients.

## Consequences

- **Positive**: Web tokens are secure against XSS (JavaScript cannot read HTTP-only cookies), CLI tokens work in headless environments, both paths verify against the same Cognito JWKS endpoint
- **Negative**: Must handle two auth paths in middleware (cookie parsing + Authorization header), CSRF protection needed for cookie-based auth (mitigated by SameSite=Lax)
- **Neutral**: Token refresh logic differs between web (automatic via cookie) and CLI (explicit refresh command)
```

---

## Example 3: Deployment Platform

```markdown
# 0003. ECS Fargate Over Serverless (Lambda) for Compute

**Date**: 2026-02-24
**Status**: Accepted

## Context

Loot Protocol needs a compute platform for the Next.js application. The main options are ECS Fargate (containerized, always-running) and Lambda with API Gateway (serverless, pay-per-invocation).

The application processes file uploads (up to 100MB for plugins), runs validation pipelines, and serves both SSR pages and API endpoints.

## Decision

Use ECS Fargate with containerized Next.js running in standalone mode.

## Alternatives Considered

- **Lambda + API Gateway with OpenNext**: Serverless deployment of Next.js. Rejected because: (1) Lambda has a 6MB request payload limit, which blocks file uploads > 6MB, (2) Lambda cold starts add 1-3 seconds to first request, degrading UX, (3) the validation pipeline processes archives in memory which can exceed Lambda's 10GB tmp storage for large plugins, (4) OpenNext is a third-party adapter adding a dependency.

- **AWS App Runner**: Simpler container service. Rejected because: less control over networking (VPC integration is limited), no task placement control, fewer scaling options than ECS.

## Consequences

- **Positive**: No payload size limits, no cold starts, full VPC control (private subnets for DB access), standard Docker deployment, predictable performance
- **Negative**: Always-on cost (even at zero traffic), must manage scaling policies ourselves, more infrastructure to configure (ALB, target groups, task definitions)
- **Neutral**: Container image management via ECR adds a build step but is standard practice
```

---

## Example 4: Monorepo Structure

```markdown
# 0004. Single Repo with Separate Package Directories Over Monorepo Tool

**Date**: 2026-02-24
**Status**: Accepted

## Context

Loot Protocol has four codebases: web app (Next.js), CLI tool, in-agent skill, and CDK infrastructure. These could live in separate repositories or together in some form of monorepo.

## Decision

Use a single repository with separate directories (`src/`, `cli/`, `skill/`, `infra/`) without a monorepo tool like Turborepo or Nx. Each directory has its own package.json where needed.

## Alternatives Considered

- **Separate repositories**: One repo per component. Rejected because: shared types between web app and CLI would require publishing a shared package, and coordinating changes across repos adds friction during rapid MVP development.

- **Turborepo/Nx monorepo**: Full monorepo tooling with workspaces. Rejected because: adds build system complexity (dependency graph, caching config) that is not justified for 4 small packages. The overhead of learning and configuring the tool exceeds the benefit at this scale.

## Consequences

- **Positive**: Simple structure, no build tool configuration, shared code via relative imports or copy, all changes in one PR
- **Negative**: No incremental builds (must manually determine what to rebuild), CLI and web app share a root but have different deployment pipelines
- **Neutral**: Can migrate to Turborepo later if build times become a problem
```
