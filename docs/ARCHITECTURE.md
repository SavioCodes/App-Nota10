# Architecture

## High-Level

Nota10 is a monorepo with shared runtime contracts:

- Client: Expo Router app (web + mobile)
- API: Express + tRPC
- Persistence: MySQL/TiDB via Drizzle ORM
- AI pipeline: extraction + chunking + artifact generation + validation

## Layering

### Client layer

- Route wrappers in `app/*`
- Feature modules in `features/*`
- Shared UI in `components/*`
- API client in `lib/trpc.ts`

### API layer

- HTTP bootstrap in `server/_core/index.ts`
- tRPC composition in `server/routers.ts`
- Domain routers in `server/routers/*.router.ts`
- Services in `server/services/*.service.ts`

### Data layer

- Compatibility barrel: `server/db.ts`
- Repositories: `server/db/*.repo.ts`
- Connection/runtime db boot: `server/db/core.ts`
- Schema/migrations: `drizzle/schema.ts`, `drizzle/*.sql`

### Shared contracts

- Static types: `shared/types.ts`
- Runtime schemas: `shared/schemas/*.ts`
- Constants/errors: `shared/const.ts`, `shared/_core/errors.ts`

## Core Pipelines

### Upload -> Ready

1. `documents.upload` validates input and stores file.
2. Document status goes to `extracting`.
3. `processDocument(...)` extracts and normalizes text.
4. Text is chunked deterministically and hashed.
5. `generateArtifactsForDocument(...)` creates/validates artifacts.
6. Review queue is synchronized.
7. Document status goes to `ready` or `error`.

### Artifact generation

- Mode-based generation: `faithful`, `deepened`, `exam`
- Cache key: `documentId + mode + sourceHash`
- Source validation against chunk IDs
- Usage counters consumed only on effective generation

### Review

- Queue retrieval: `review.today`, `review.all`
- Answer handling applies SM-2 parameters
- Queue sync is idempotent per user/artifact

## Compatibility Guarantees

- `server/routers.ts` remains the app router entrypoint.
- `server/db.ts` remains the database API entrypoint.
- Public tRPC procedure names and payload contracts are preserved.
