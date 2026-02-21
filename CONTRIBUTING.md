# Contributing

## Branching

- Base branch: `main`
- Feature branches: `feat/*`, `refactor/*`, `fix/*`, `docs/*`

## Commit Style

Use Conventional Commits:

- `feat(scope): ...`
- `fix(scope): ...`
- `refactor(scope): ...`
- `docs(scope): ...`
- `test(scope): ...`
- `chore(scope): ...`

## Local Validation

Before opening a PR:

```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```

## Pull Request Checklist

- Clear summary and motivation
- Non-breaking API confirmation (if applicable)
- Tests updated/added where needed
- Docs updated (`README`, `docs/*`, `CHANGELOG`)
- Validation output included in PR description

## Documentation Policy

- `README.md`: English canonical
- `README.pt-BR.md`: Portuguese mirror
- Keep both files aligned when behavior changes

## Security

Do not commit secrets or `.env`. Follow `SECURITY.md` for vulnerability reporting.
