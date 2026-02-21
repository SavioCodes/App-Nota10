# Backend Guide

This backend uses Express + tRPC with domain routers, service orchestration, and repository-based DB access.

## Key Entry Points

- HTTP bootstrap: `server/_core/index.ts`
- Router composition: `server/routers.ts`
- Domain routers: `server/routers/*.router.ts`
- Services: `server/services/*.service.ts`
- DB barrel (compat): `server/db.ts`
- DB repositories: `server/db/*.repo.ts`

## Request Flow

1. Express receives request
2. tRPC middleware resolves context/auth
3. Domain router validates input (Zod)
4. Service coordinates business logic
5. Repository reads/writes DB
6. Typed response returned to client

## Domain Routers

- `auth.router.ts`
- `folders.router.ts`
- `documents.router.ts`
- `chunks.router.ts`
- `artifacts.router.ts`
- `review.router.ts`
- `usage.router.ts`

## Services

- `artifact-generation.service.ts`: generation pipeline + processing orchestration
- `review-sync.service.ts`: idempotent review initialization
- `usage-limits.service.ts`: usage and rate limit guards

## Database Layer

Repositories:

- `users.repo.ts`
- `subscriptions.repo.ts`
- `folders.repo.ts`
- `documents.repo.ts`
- `artifacts.repo.ts`
- `review.repo.ts`
- `usage.repo.ts`

Connection:

- `core.ts` (`getDb`)

## Dev Commands

```bash
corepack pnpm dev:server
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```

## Compatibility Rule

Keep public contracts stable:

- Preserve `server/routers.ts` exports
- Preserve `server/db.ts` exports
- Avoid breaking procedure names/payload shapes
