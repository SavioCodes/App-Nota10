# Nota10

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/SavioCodes/App-Nota10/actions/workflows/ci.yml/badge.svg)](https://github.com/SavioCodes/App-Nota10/actions/workflows/ci.yml)

AI-assisted study platform built with Expo + React Native (web/mobile) and an Express + tRPC backend.

- Portuguese version: [`README.pt-BR.md`](./README.pt-BR.md)

## Overview

Nota10 converts raw study material (images/PDF) into structured artifacts:

- summaries
- content maps
- flashcards
- exam questions

Core flow:

1. Upload image/PDF
2. Extract text (OCR/native PDF)
3. Chunk and hash source text
4. Generate artifacts (`faithful`, `deepened`, `exam`)
5. Review with spaced repetition (SM-2)

## Tech Stack

- Frontend: Expo Router, React Native, NativeWind, React Query, tRPC client
- Backend: Express, tRPC, Drizzle ORM, MySQL/TiDB, Zod
- AI: Gemini (fast + strict profiles)
- Billing: RevenueCat
- Tooling: TypeScript strict, ESLint, Vitest, Drizzle Kit

## Project Structure

```text
app/                # Route wrappers (Expo Router)
features/           # Feature-first UI modules
components/         # Reusable UI components
server/             # API, services, DB repositories
shared/             # Shared contracts, schemas, constants
drizzle/            # Schema + SQL migrations
tests/              # Unit/integration tests
docs/               # Technical documentation
```

Full map: [`docs/PROJECT-STRUCTURE.md`](./docs/PROJECT-STRUCTURE.md)

## Quick Start

### 1) Requirements

- Node.js 22+
- Corepack enabled
- pnpm 9.x
- MySQL/TiDB instance

### 2) Install

```bash
corepack pnpm install
```

### 3) Configure environment

```bash
cp .env.example .env
```

Fill required variables (database, OAuth, Gemini, storage, RevenueCat).

### 4) Run in development

```bash
corepack pnpm dev
```

## Validation Gates

```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```

## Database

Generate/apply migrations:

```bash
corepack pnpm db:push
```

Schema source: [`drizzle/schema.ts`](./drizzle/schema.ts)

## Runtime Docs

- Architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- API reference: [`docs/API.md`](./docs/API.md)
- Usage guide: [`docs/USAGE.md`](./docs/USAGE.md)
- Runbook: [`docs/RUNBOOK.md`](./docs/RUNBOOK.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
- Contribution guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## Notes

- `server/db.ts` and `server/routers.ts` are compatibility barrels.
- Business/domain logic now lives in:
  - `server/db/*.repo.ts`
  - `server/services/*.service.ts`
  - `server/routers/*.router.ts`
  - `features/*`

## License

MIT. See [`LICENSE`](./LICENSE).
