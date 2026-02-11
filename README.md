# Nota10

Aplicativo educacional construido com Expo + React Native + backend Node/tRPC para transformar materiais (fotos e PDFs) em conteudo de estudo com IA.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://docs.expo.dev/)

---

## Sumario

1. Produto e objetivo
2. Funcionalidades
3. Arquitetura
4. Stack tecnica
5. Estrutura de pastas
6. Requisitos
7. Instalacao e execucao
8. Variaveis de ambiente
9. Fluxos principais
10. API backend
11. Banco de dados
12. Pagamentos (RevenueCat)
13. Scripts
14. Qualidade e validacao
15. Troubleshooting
16. Seguranca
17. Publicacao no GitHub
18. Licenca

---

## 1) Produto e objetivo

O Nota10 resolve um problema simples: converter material bruto em conteudo estudavel rapidamente.

Objetivos principais:

- Reduzir o tempo entre "tenho material" e "estou estudando"
- Dar rastreabilidade das respostas no modo fiel
- Organizar documentos por pasta/materia
- Permitir revisao espaciada
- Monetizar com plano gratuito + assinaturas reais

---

## 2) Funcionalidades

### OCR e geracao com IA

- OCR para imagem e PDF
- Quebra do texto em chunks
- Geracao de artefatos:
  - resumo
  - mapa de conteudo
  - flashcards
  - questoes

### Modos de estudo

- `faithful`: baseado apenas no material
- `deepened`: pode complementar
- `exam`: foco em questoes estilo prova

### Fonte e rastreabilidade

- Cada item pode conter `sourceChunkIds`
- Modal "Ver fonte" para ver o trecho original

### Biblioteca

- Pastas por materia
- Documentos recentes na home
- Tela de pasta com status por documento

### Revisao

- Fila diaria
- Sessao de revisao com nota de qualidade
- Metricas basicas na aba de revisao

### Monetizacao

- Plano gratuito com limite diario de conversoes
- Integracao real com RevenueCat (iOS/Android)
- Webhook backend para sincronizacao de assinatura

### Exportacao

- Exportacao para HTML formatado
- Compartilhamento nativo em mobile

---

## 3) Arquitetura

Monorepo com frontend e backend no mesmo workspace.

- Frontend: Expo Router (mobile + web)
- Backend: Express + tRPC
- DB: MySQL via Drizzle
- Auth: OAuth + cookie/JWT
- Storage: proxy de upload
- LLM: Gemini 3 Flash (OCR + geracao) + Gemini 3 Pro (validacao/quality gate)

Fluxo resumido:

1. Login
2. Upload de imagem/PDF
3. Processamento assinc (OCR + chunks + geracao + validacao)
4. Consulta dos artefatos na tela de resultados
5. Revisao/exportacao

---

## 4) Stack tecnica

### Frontend

- `expo` `~54.0.29`
- `react` `19.1.0`
- `react-native` `0.81.5`
- `expo-router`
- `nativewind`
- `@tanstack/react-query`
- `@trpc/react-query`

### Backend

- `express`
- `@trpc/server`
- `drizzle-orm`
- `mysql2`
- `jose`
- `zod`
- `@google/genai` (Gemini API)
- `pdf-parse` (texto nativo de PDF)
- `pdf-lib` (limite de paginas para OCR)

### Pagamentos

- `react-native-purchases`

### Tooling

- TypeScript strict
- ESLint
- Prettier
- Vitest
- Esbuild

---

## 5) Estrutura de pastas

```text
app/
  _layout.tsx
  onboarding.tsx
  scanner.tsx
  upload-pdf.tsx
  paywall.tsx
  export-pdf.tsx
  review-session.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    library.tsx
    review.tsx
    profile.tsx
  document/[id].tsx
  folder/[id].tsx
  results/[id].tsx
  oauth/callback.tsx

server/
  routers.ts
  db.ts
  storage.ts
  _core/
    index.ts
    context.ts
    trpc.ts
    oauth.ts
    revenuecat.ts
    llm.ts
    extraction.ts
    chunker.ts
    artifacts.ts
    env.ts
    cookies.ts

drizzle/
  schema.ts
  0000_*.sql
  0001_*.sql
  0002_revenuecat_subscriptions.sql
  meta/

lib/
  trpc.ts
  theme-provider.tsx
  purchases-provider.tsx
  purchases-provider.web.tsx
  _core/

constants/
  oauth.ts
  revenuecat.ts
  theme.ts

shared/
  const.ts
  revenuecat.ts

tests/
  auth.logout.test.ts
```

---

## 6) Requisitos

- Node.js 22+
- Corepack habilitado
- pnpm 9.x
- Banco MySQL/TiDB acessivel

Opcional para mobile:

- Android Studio / Xcode
- Conta App Store / Google Play
- Conta RevenueCat

---

## 7) Instalacao e execucao

### Instalar dependencias

```bash
corepack pnpm install
```

### Desenvolvimento (backend + frontend)

```bash
corepack pnpm dev
```

### Validacao local

```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```

### Migracoes

```bash
corepack pnpm db:push
```

---

## 8) Variaveis de ambiente

### Backend

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `OWNER_OPEN_ID`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `REVENUECAT_WEBHOOK_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_FAST_MODEL` (padrao: `gemini-3-flash-preview`)
- `GEMINI_STRICT_MODEL` (padrao: `gemini-3-pro-preview`)
- `GEMINI_THINKING_LEVEL_FAST` (padrao: `medium`, em modo prova pode subir para `high`)
- `GEMINI_THINKING_LEVEL_STRICT` (padrao: `high`)
- `MAX_UPLOAD_MB` (padrao: `15`)
- `MAX_PDF_PAGES_OCR` (padrao: `30`)

### Frontend (Expo public)

- `EXPO_PUBLIC_APP_ID`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_OAUTH_PORTAL_URL`
- `EXPO_PUBLIC_OAUTH_SERVER_URL`
- `EXPO_PUBLIC_OWNER_OPEN_ID`
- `EXPO_PUBLIC_OWNER_NAME`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`

Obs: `scripts/load-env.js` mapeia parte das variaveis backend para Expo public.

---

## 9) Fluxos principais

### Login

- Web: cookie auth
- Mobile: bearer token + SecureStore
- Callback: `app/oauth/callback.tsx`

### Upload e processamento

1. Upload na UI
2. `documents.upload`
3. Storage + documento status `extracting`
4. Extracao:
   - Imagem: OCR com Gemini Flash
   - PDF: tenta texto nativo, fallback OCR Gemini (limitado por `MAX_PDF_PAGES_OCR`)
5. Chunking deterministico com offsets + hash do texto
6. Geracao de artefatos com Gemini Flash
7. Validacao/correcao com Gemini Pro (quality gate)
8. Cache por hash para evitar regeneracao
9. Status final `ready`

### Modo Fiel (Flash + Pro)

- Flash gera conteudo estruturado com `sourceChunkIds`
- Pro valida se cada item esta sustentado pelos chunks citados
- Se nao houver suporte no material: item marcado com `notFoundInMaterial`
- Justificativa de arquitetura:
  - Flash = menor custo e menor latencia
  - Pro = maior precisao para checagem factual

### Cache e custo

- Hash SHA-256 do texto extraido salvo em `documents.textHash`
- Artefatos salvos com `artifacts.sourceHash`
- `artifacts.generate` reutiliza cache quando `documentId + mode + sourceHash` ja existe
- Conversao do plano free e debitada na geracao efetiva (nao na navegacao)

### Resultado

- Tabs: resumo, mapa, flashcards, questoes
- Modos: faithful, deepened, exam
- Ver fonte por chunk

### Revisao

- `review.today`
- `review.answer`
- Sessao em `app/review-session.tsx`

---

## 10) API backend

### Endpoints Express

- `GET /api/health`
- `GET /api/oauth/callback`
- `GET /api/oauth/mobile`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/session`
- `POST /api/revenuecat/webhook`
- `POST /api/trpc/*`

### Routers tRPC

- `auth`: `me`, `logout`
- `folders`: `list`, `create`, `delete`
- `documents`: `list`, `recent`, `get`, `upload`
- `chunks`: `list`
- `artifacts`: `list`, `generate`
- `review`: `today`, `all`, `answer`, `initForDocument`
- `usage`: `today`
- `system`: `health`, `notifyOwner`

---

## 11) Banco de dados

Tabelas principais:

- `users`
- `subscriptions`
- `usage_counters`
- `folders`
- `documents`
- `chunks`
- `artifacts`
- `review_items`

Notas:

- `usage_counters` possui unique `(userId, date)`
- `subscriptions` usa `revenueCatId` unico
- `documents.textHash` guarda hash do texto extraido para idempotencia/cache
- `chunks` inclui `startOffset` e `endOffset` para referencia de fonte
- `artifacts.sourceHash` vincula artefatos ao hash atual do documento

Migracoes:

- `0000_*` base
- `0001_*` dominio app
- `0002_revenuecat_subscriptions.sql`
- `0003_gemini_pipeline.sql`

---

## 12) Pagamentos (RevenueCat)

Produtos no codigo:

- `nota10_pro_monthly`
- `nota10_pro_enem_monthly`

Arquivos-chave:

- `shared/revenuecat.ts`
- `constants/revenuecat.ts`
- `lib/purchases-provider.tsx`
- `lib/purchases-provider.web.tsx`
- `app/paywall.tsx`
- `server/_core/revenuecat.ts`
- `server/db.ts`

Webhook:

```text
POST https://SEU_BACKEND/api/revenuecat/webhook
Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
```

---

## 13) Scripts

- `dev`
- `dev:server`
- `dev:metro`
- `build`
- `start`
- `check`
- `lint`
- `format`
- `test`
- `db:push`
- `android`
- `ios`
- `qr`

---

## 14) Qualidade e validacao

Checklist minimo antes de publicar:

```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```

Padroes adicionados ao repositorio:

- `.editorconfig`
- `.gitattributes`
- `SECURITY.md`

Cobertura de testes atual adicionada para pipeline IA:

- chunker deterministico
- validacao de fontes no modo fiel
- cache de `artifacts.generate` para mesmo hash

---

## 15) Troubleshooting

### `File 'expo/tsconfig.base' not found`

1. Instale dependencias: `corepack pnpm install`
2. Reinicie o TS Server no VS Code

### `Cannot use JSX unless '--jsx' is provided`

Esse erro aparece em cascata quando o TS config base nao eh carregado.

- Confirmar `corepack pnpm check` local
- Reiniciar TS Server
- Reabrir workspace na pasta raiz do projeto

### Compra nao atualiza plano

- Verificar webhook
- Verificar secret
- Verificar `app_user_id` = `openId`
- Verificar IDs de produto

### `GEMINI_API_KEY is not configured`

- Defina `GEMINI_API_KEY` no backend
- Reinicie `pnpm dev:server`

### `FILE_TOO_LARGE_MAX_*_MB`

- Reduza o arquivo ou aumente `MAX_UPLOAD_MB`
- Para PDF escaneado grande, prefira dividir por capitulos

### OCR de PDF ficou incompleto

- Aumente `MAX_PDF_PAGES_OCR`
- Use documento com melhor resolucao
- Verifique se o PDF tem camada de texto nativa (quando tem, o custo cai e a precisao sobe)

---

## 16) Seguranca

Consulte `SECURITY.md` para reportar vulnerabilidades.

Recomendacoes:

- Nunca subir `.env`
- Habilitar 2FA na conta GitHub
- Usar tokens com escopo minimo
- Rotacionar secrets periodicamente

---

## 17) Publicacao no GitHub

Se quiser conectar este projeto ao repositorio remoto:

```bash
git init
git branch -M main
git remote add origin https://github.com/SavioCodes/App-Nota10.git
git add .
git commit -m "chore: initial professional repository setup"
git push -u origin main
```

Se ja existir remote:

```bash
git remote set-url origin https://github.com/SavioCodes/App-Nota10.git
```

Para deixar privado depois:

- GitHub > Settings > General > Change repository visibility > Private

---

## 18) Licenca

MIT License.

Consulte: `LICENSE`

---

## Arquivos principais para navegacao rapida

- `app/_layout.tsx`
- `app/paywall.tsx`
- `app/results/[id].tsx`
- `app/review-session.tsx`
- `server/routers.ts`
- `server/db.ts`
- `server/_core/revenuecat.ts`
- `drizzle/schema.ts`
- `todo.md`
