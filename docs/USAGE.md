# Usage Guide

## Local Development

1. Install dependencies:

```bash
corepack pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Start backend + frontend:

```bash
corepack pnpm dev
```

## Quality Gates

Run before every push:

```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```

## Typical Product Flow

1. Login
2. Create/select folder
3. Upload image or PDF
4. Wait for `extracting -> generating -> ready`
5. Open results (`summary/map/flashcards/questions`)
6. Open "Ver fonte" where available
7. Run review session and answer cards

## Modes

- `faithful`: strict source fidelity
- `deepened`: allows complementary content
- `exam`: source-based exam-oriented generation

## Export

- Open export screen
- Select desired sections
- Generate HTML export
- Share/download (mobile/web)
