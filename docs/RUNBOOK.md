# Runbook

## Health Checks

- API:

```bash
curl http://localhost:3000/api/health
```

- Type safety:

```bash
corepack pnpm check
```

- Lint:

```bash
corepack pnpm lint
```

- Tests:

```bash
corepack pnpm test
```

## Database Operations

Sync schema to PostgreSQL:

```bash
corepack pnpm db:push
```

Generate SQL migration files (optional, repository maintenance):

```bash
corepack pnpm db:generate
```

## Common Incidents

## 1) `DATABASE_URL is required`

- Confirm `.env` is loaded.
- Check `DATABASE_URL` format.

## 2) OAuth callback/login failure

- Validate `VITE_APP_ID`, `OAUTH_SERVER_URL`, `EXPO_PUBLIC_OAUTH_PORTAL_URL`.
- Confirm redirect URI/deep link scheme setup.

## 3) Gemini generation failure

- Confirm `GEMINI_API_KEY`.
- Validate model names (`GEMINI_FAST_MODEL`, `GEMINI_STRICT_MODEL`).

## 4) Mercado Pago webhook issues

- Validate `MERCADOPAGO_WEBHOOK_SECRET`.
- Confirm webhook URL `/api/billing/webhook/mercadopago` is reachable.
- Recheck provider event dedupe in `billing_webhook_events`.

## 5) Upload blocked

- Check `MAX_UPLOAD_MB`, MIME whitelist, and upload rate limit env knobs.

## Deployment Checklist

1. `check/lint/test` green
2. CI workflow green
3. Required env vars present
4. Migrations applied
5. Smoke flow validated (`login -> upload -> generate -> review`)
