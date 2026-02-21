# API Reference (tRPC + HTTP)

## HTTP Endpoints

- `GET /api/health`
- `GET /api/oauth/callback`
- `GET /api/oauth/mobile`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/session`
- `POST /api/revenuecat/webhook`
- `POST /api/trpc/*`

## tRPC Routers

## `auth`

- `me` -> current user (or null)
- `logout` -> clears session cookie

## `folders`

- `list`
- `create({ name })`
- `delete({ id })`

## `documents`

- `list({ folderId? })`
- `recent`
- `get({ id })`
- `upload({ folderId, title, fileBase64, fileName, mimeType })`

## `chunks`

- `list({ documentId })`

## `artifacts`

- `list({ documentId, type?, mode? })`
- `generate({ documentId, mode })`

## `review`

- `today`
- `all`
- `answer({ reviewItemId, quality })`
- `initForDocument({ documentId })`

## `usage`

- `today`

## `system`

- `health`
- `notifyOwner`

## Error Contracts (relevant)

- `LIMIT_REACHED`
- `RATE_LIMITED_RETRY_AFTER_<N>_SECONDS`
- `DOCUMENT_NOT_FOUND`
- `FOLDER_NOT_FOUND`
- `REVIEW_ITEM_NOT_FOUND`
