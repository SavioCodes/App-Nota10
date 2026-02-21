# Nota10 - Technical Audit

Date: 2026-02-21

## Scope
- Repository status after structural refactor and billing migration away from RevenueCat.
- Focus on runtime reliability, security posture, and readiness blockers.

## Validation Evidence

Executed locally:
- `corepack pnpm check` -> OK
- `corepack pnpm lint` -> OK
- `corepack pnpm test` -> OK (16 files, 63 tests)
- `corepack pnpm build` -> OK

## Current Implementation Status

### Completed
- Backend reorganized by domain (routers/services/repos), with compatibility barrels preserved.
- Frontend split into feature modules.
- Review flow renders real flashcard content and keeps SM-2 progression.
- Account deletion is functional (server-side cascade + storage cleanup attempts).
- Runtime legacy RevenueCat removed (client/provider/webhook/runtime env mapping).
- Billing web flow centered on Mercado Pago.
- Security/logging baseline improved (redacted logs, stricter auth handling).

### Completed in this pass (no API key required)
- Removed remaining RevenueCat schema/runtime residues from active code paths.
- Dropped RevenueCat residue in target DB (`revenueCatId`, `revenuecat_webhook_events`).
- Hardened `billing.mobileVerifyPurchase`:
  - no entitlement grant from unverified client payload
  - explicit precondition errors when native billing or verifier config is missing
- Updated `.env.example` and env mapping for billing feature flags.
- Updated `todo.md` and this audit to reflect current stack.
- Switched DB sync script to `drizzle-kit push`.

## Open Blockers (external credentials/services)

1. AI generation:
- `GEMINI_API_KEY` is required for OCR/LLM generation.

2. Mercado Pago production flow:
- `BILLING_MERCADOPAGO_WEB_ENABLED=true`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_WEBHOOK_URL`

3. Supabase Auth providers:
- Google provider credentials
- Apple provider credentials

4. Native mobile billing compliance (iOS/Android):
- Apple/Google server-side receipt validation is not implemented yet.
- Current mobile subscription UX opens external Mercado Pago checkout.

## Risks to Keep Visible

1. Native IAP compliance risk:
- For store distribution with digital subscriptions, native IAP flow and validation must be completed.

2. Migration history debt:
- Legacy SQL migration files still exist from prior MySQL stage.
- Runtime now uses PostgreSQL schema + `drizzle-kit push`, but historical migration cleanup is still recommended.

## Recommended Next Actions

1. Configure credentials and enable Mercado Pago webhook end-to-end.
2. Implement Apple/Google purchase verification service and wire `mobileVerifyPurchase`.
3. Normalize historical migration artifacts into a clean PostgreSQL-only migration history.
4. Run full manual E2E (Android/iOS + web) and capture evidence.
