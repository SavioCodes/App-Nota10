# Contributing

Thanks for contributing to Nota10.

## Development Setup

1. Install dependencies:

```bash
corepack pnpm install
```

2. Start development environment:

```bash
corepack pnpm dev
```

3. Validate before opening PR:

```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```

## Branching

- Create branches from `main`
- Suggested naming:
  - `feat/<short-name>`
  - `fix/<short-name>`
  - `chore/<short-name>`

## Pull Request Guidelines

- Keep PRs focused and small
- Include problem statement and solution summary
- Reference related issue(s)
- Add migration notes if schema changed
- Update docs when behavior changes

## Commit Message Suggestion

Use conventional style when possible:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `chore: ...`
- `refactor: ...`

## Code Style

- TypeScript strict mode
- Keep business logic in `server/` and UI logic in `app/`
- Prefer explicit typing for API boundaries
- Avoid committing secrets or credentials

## Security

For vulnerability reports, follow `SECURITY.md`.
