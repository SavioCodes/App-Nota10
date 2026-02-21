# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning principles for release notes.

## [Unreleased]

### Added
- Baseline snapshot before structural refactor on branch `refactor/structure-quality-docs`.
- Shared runtime schemas for artifacts in `shared/schemas/artifacts.ts`.
- CI workflow gates in `.github/workflows/ci.yml`.
- Bilingual documentation set (`README.md`, `README.pt-BR.md`, `docs/*`, `CONTRIBUTING.md`).

### Changed
- Backend router architecture split into domain routers (`server/routers/*.router.ts`).
- Backend business logic extracted into services (`server/services/*.service.ts`).
- Database access layer modularized into repositories (`server/db/*.repo.ts`) with compatibility barrel in `server/db.ts`.
- Large screens decomposed into feature modules (`features/results`, `features/export`, `features/review`) with route wrappers preserved in `app/*`.
- `server/README.md` replaced with project-aligned backend documentation.

### Notes
- Baseline validation commands expected for this snapshot:
  - `corepack pnpm check`
  - `corepack pnpm lint`
  - `corepack pnpm test`
