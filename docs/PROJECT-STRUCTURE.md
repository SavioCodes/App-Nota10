# Project Structure

## Root

```text
app/                 Expo Router route wrappers
features/            Feature-first screen modules and domain UI helpers
components/          Shared UI components
constants/           Client constants
hooks/               Client hooks
lib/                 Runtime providers and API clients
server/              Backend (routers, services, db repositories)
shared/              Shared types/schemas/constants
drizzle/             Schema and migrations
tests/               Unit/integration test suites
docs/                Technical documentation
```

## Backend

```text
server/
  db.ts                        # compatibility barrel
  db/
    core.ts
    users.repo.ts
    subscriptions.repo.ts
    folders.repo.ts
    documents.repo.ts
    artifacts.repo.ts
    review.repo.ts
    usage.repo.ts
  routers.ts                   # appRouter composition
  routers/
    auth.router.ts
    folders.router.ts
    documents.router.ts
    chunks.router.ts
    artifacts.router.ts
    review.router.ts
    usage.router.ts
  services/
    artifact-generation.service.ts
    review-sync.service.ts
    usage-limits.service.ts
```

## Frontend

```text
app/
  results/[id].tsx             # wrapper -> features/results/ResultsScreen.tsx
  export-pdf.tsx               # wrapper -> features/export/ExportScreen.tsx
  review-session.tsx           # wrapper -> features/review/ReviewSessionScreen.tsx
  (tabs)/review.tsx            # wrapper -> features/review/ReviewTabScreen.tsx

features/
  artifacts/parsers.ts
  results/
    ResultsScreen.tsx
    use-results-data.ts
    components/
      FlashcardItem.tsx
      SourceModal.tsx
  export/
    ExportScreen.tsx
    html-builder.ts
    parsers.ts
  review/
    ReviewTabScreen.tsx
    ReviewSessionScreen.tsx
    queue.ts
    session.ts
```

## Shared Contracts

```text
shared/
  types.ts
  const.ts
  schemas/
    artifacts.ts
```
