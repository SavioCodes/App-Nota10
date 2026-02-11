# Auditoria Tecnica - Nota10

Data: 2026-02-11  
Escopo: monorepo local (`Expo + React Native + Express + tRPC + Drizzle/MySQL`)

## 1) Resumo executivo

- O projeto compila em TypeScript strict e os testes atuais passam.
- O pipeline principal de OCR/chunks/artefatos existe no codigo e tem testes de unidade/integracao para partes criticas (chunker, validador, cache de artifacts).
- O fluxo manual ponta-a-ponta nao foi comprovado por falta de servicos/chaves externas (OAuth, DB real, Gemini e proxy de storage).
- O comando `corepack pnpm dev` falha no ambiente atual porque o script chama `pnpm` diretamente dentro do `concurrently`.
- A seguranca tem riscos importantes: CORS aberto com credenciais, falta de verificacao de ownership por recurso, webhook RevenueCat sem assinatura forte/replay e `.env` nao ignorado no `.gitignore`.
- Monetizacao via RevenueCat esta integrada no app/backend, mas validacao robusta de webhook e operacao E2E continuam NAO VERIFICADAS.

---

## 2) Evidencias de execucao (Passo 0 e comandos principais)

| Comando | Status | Evidencia principal |
|---|---|---|
| `corepack pnpm install` | OK | lockfile atualizado, sem erro |
| `corepack pnpm check` | OK | `tsc --noEmit` sem erros |
| `corepack pnpm lint` | OK (com warnings) | 53 warnings, 0 errors |
| `corepack pnpm test` | OK | `3 passed`, `1 skipped` |
| `corepack pnpm db:push` | FAIL | `DATABASE_URL is required to run drizzle commands` |
| `corepack pnpm dev` | FAIL | `'pnpm' nao e reconhecido...` dentro do `concurrently` |
| `GET /api/health` | OK | `200` e body `{"ok":true,"timestamp":...}` |
| tRPC `system.health` | OK | `TRPC_HEALTH_OK {"ok":true}` |

Comandos executados:
- `corepack pnpm install`
- `corepack pnpm check`
- `corepack pnpm lint`
- `corepack pnpm test`
- `corepack pnpm db:push`
- `corepack pnpm dev`
- `corepack pnpm dev:server` + request `http://localhost:3000/api/health`
- `corepack pnpm dev:server` + cliente tRPC para `system.health`

---

## 3) Funcionalidade vs status (README vs implementacao real)

Legenda usada:
- `IMPLEMENTADO E TESTADO`
- `IMPLEMENTADO MAS NAO TESTADO`
- `PARCIAL / QUEBRADO`
- `NAO EXISTE (FAKE)`

| Item | Status | Evidencia |
|---|---|---|
| A) OCR imagem e PDF | IMPLEMENTADO MAS NAO TESTADO | OCR imagem via Gemini em `server/_core/extraction.ts:92`; PDF nativo + fallback OCR em `server/_core/extraction.ts:202` e `server/_core/extraction.ts:220`; limite de paginas em `server/_core/extraction.ts:217`; `mediaResolution` medium/high em `server/_core/extraction.ts:220` e `server/_core/extraction.ts:222`. |
| B) Chunks | IMPLEMENTADO E TESTADO | Chunker deterministico em `server/_core/chunker.ts:87`; offsets em `server/_core/chunker.ts:123`; hash em `server/_core/chunker.ts:49`; rota `chunks.list` em `server/routers.ts:377`; tabela `chunks` em `drizzle/schema.ts:76`; teste `tests/chunker.test.ts:19`. |
| C) Artefatos (`list/generate`) | IMPLEMENTADO E TESTADO | Rotas `artifacts.list/generate` em `server/routers.ts:383`; estrutura no DB em `drizzle/schema.ts:89`; parse/normalizacao em `server/_core/artifacts.ts:108`; cache por hash em `server/routers.ts:213`; teste integracao cache em `tests/artifacts.generate.integration.test.ts:177`. |
| D) Modo fiel com `sourceChunkIds` + "Ver fonte" | IMPLEMENTADO MAS NAO TESTADO | Regras de modo fiel em `server/routers.ts:61`; validacao de fontes em `server/_core/artifacts.ts:212`; `sourceChunkIds` no schema `drizzle/schema.ts:94`; UI "Ver fonte" em `app/results/[id].tsx:139` e modal com texto do chunk em `app/results/[id].tsx:270`. |
| E) Revisao espacada (`today/answer/initForDocument`) | PARCIAL / QUEBRADO | Rotas existem em `server/routers.ts:413`; algoritmo de resposta em `server/routers.ts:420`; mas `review.answer` nao carrega estado atual do item (reseta variaveis locais), indicando logica incompleta em `server/routers.ts:420`; tela sessao usa `Flashcard #artifactId` em vez de frente/verso real (`app/review-session.tsx:119`). |
| F) Monetizacao (RevenueCat + webhook + subscriptions/usage) | PARCIAL / QUEBRADO | SDK no app em `lib/purchases-provider.tsx:2`; purchase/restore em `lib/purchases-provider.tsx:124` e `lib/purchases-provider.tsx:134`; webhook existe em `server/_core/revenuecat.ts:50`; tabela `subscriptions` e `usage_counters` em `drizzle/schema.ts:20` e `drizzle/schema.ts:39`; porem webhook aceita apenas bearer opcional (`server/_core/revenuecat.ts:52`) e nao valida assinatura/timestamp/replay. |
| G) Exportacao | IMPLEMENTADO MAS NAO TESTADO | Implementa exportacao HTML em `app/export-pdf.tsx:37`; grava arquivo e compartilha em `app/export-pdf.tsx:118` e `app/export-pdf.tsx:124`; no web faz download HTML em `app/export-pdf.tsx:130`. |
| H) Auth/OAuth (mobile vs web) | IMPLEMENTADO MAS NAO TESTADO | Rotas OAuth em `server/_core/oauth.ts:64`; token/cookie/JWT em `server/_core/sdk.ts:148` e `server/_core/sdk.ts:181`; web cookie + native bearer no cliente em `lib/_core/api.ts:20`; callback no app em `app/oauth/callback.tsx:22`; depende de servico externo (`OAUTH_SERVER_URL`) em `server/_core/sdk.ts:70`. |

Itens que estao no README e batem com o codigo:
- Rotas principais tRPC/Express: `server/routers.ts:310`, `server/_core/index.ts:61`.
- Pipeline Flash + Pro (gera e valida): `server/routers.ts:220`, `server/routers.ts:224`.
- Cache por hash: `server/routers.ts:211`, `server/routers.ts:213`.
- Uniques em schema: `usage_counters` (`drizzle/schema.ts:45`), `subscriptions.revenueCatId` (`drizzle/schema.ts:33`).

---

## 4) Lista completa de variaveis de ambiente

### 4.1 Backend

| Variavel | Onde usada (arquivo:linha) | Para que serve | Obrigatoria | Default | Validacao/comportamento |
|---|---|---|---|---|---|
| `DATABASE_URL` | `drizzle.config.ts:3`, `drizzle.config.ts:5`, `server/db.ts:23`, `server/_core/env.ts:4` | conexao DB e comandos drizzle | Dev/Prod backend: sim (para recursos com DB). Mobile/Web: N/A | `""` em runtime env; sem default em drizzle | `db:push` falha sem ela |
| `JWT_SECRET` | `server/_core/env.ts:3`, `server/_core/sdk.ts:138` | assinar/verificar JWT de sessao | Prod backend: sim; Dev: recomendado forte | `""` | sem throw; vazio funciona, mas inseguro |
| `VITE_APP_ID` | `server/_core/env.ts:2`, `server/_core/sdk.ts:48`, `server/_core/sdk.ts:155`, `server/_core/sdk.ts:215` | clientId/projeto OAuth | Dev/Prod backend: sim para OAuth | `""` | sem throw; fluxo OAuth tende a falhar sem valor |
| `OAUTH_SERVER_URL` | `server/_core/env.ts:5`, `server/_core/sdk.ts:70`, `server/_core/sdk.ts:36` | URL do backend OAuth externo | Dev/Prod backend: sim para login | `""` | loga erro quando vazio |
| `OWNER_OPEN_ID` | `server/_core/env.ts:6`, `server/db.ts:71` | bootstrap de role admin do owner | Opcional | `""` | sem validacao |
| `NODE_ENV` | `server/_core/env.ts:7` | sinaliza producao (`isProduction`) | Opcional | compara com `"production"` | sem validacao |
| `BUILT_IN_FORGE_API_URL` | `server/_core/env.ts:8`, `server/storage.ts:9`, `server/_core/dataApi.ts:20`, `server/_core/imageGeneration.ts:35`, `server/_core/voiceTranscription.ts:83` | proxy externo de storage/apis internas | Obrigatoria para upload/storage e alguns recursos auxiliares | `""` | funcoes lancam erro quando ausente |
| `BUILT_IN_FORGE_API_KEY` | `server/_core/env.ts:9`, `server/storage.ts:10`, `server/_core/dataApi.ts:24`, `server/_core/imageGeneration.ts:39`, `server/_core/voiceTranscription.ts:90` | autenticacao no proxy externo | Obrigatoria para upload/storage; fallback Gemini | `""` | funcoes lancam erro quando ausente |
| `REVENUECAT_WEBHOOK_SECRET` | `server/_core/env.ts:10`, `server/_core/revenuecat.ts:52` | bearer token do webhook | Recomendado em prod | `""` | se vazio, webhook fica sem checagem de token |
| `GEMINI_API_KEY` | `server/_core/env.ts:11`, `server/_core/llm.ts:335` | chave Gemini | Obrigatoria para OCR/LLM (ou fallback forge key) | fallback: `BUILT_IN_FORGE_API_KEY` | `invokeLLM` lança erro sem chave efetiva |
| `GEMINI_FAST_MODEL` | `server/_core/env.ts:12`, `server/_core/llm.ts:326` | modelo fast | Opcional | `gemini-3-flash-preview` | sem validacao extra |
| `GEMINI_STRICT_MODEL` | `server/_core/env.ts:13`, `server/_core/llm.ts:325` | modelo strict/quality gate | Opcional | `gemini-3-pro-preview` | sem validacao extra |
| `GEMINI_THINKING_LEVEL_FAST` | `server/_core/env.ts:14`, `server/_core/llm.ts:318` | nivel de raciocinio fast | Opcional | `medium` | normalizado; invalido cai em `medium` |
| `GEMINI_THINKING_LEVEL_STRICT` | `server/_core/env.ts:15`, `server/_core/llm.ts:311` | nivel strict | Opcional | `high` | normalizado; invalido cai em `high` |
| `MAX_UPLOAD_MB` | `server/_core/env.ts:16`, `server/_core/extraction.ts:37` | limite upload | Opcional | `15` | `FILE_TOO_LARGE_MAX_*_MB` |
| `MAX_PDF_PAGES_OCR` | `server/_core/env.ts:17`, `server/_core/extraction.ts:217` | teto de paginas OCR de PDF | Opcional | `30` | usado no recorte do PDF |
| `PORT` | `server/_core/index.ts:73` | porta backend | Opcional | `3000` | fallback automatico |
| `EXPO_WEB_PREVIEW_URL` | `server/_core/oauth.ts:89` | redirect web apos callback OAuth | Opcional | fallback para `EXPO_PACKAGER_PROXY_URL` e depois localhost | sem validacao |
| `EXPO_PACKAGER_PROXY_URL` | `server/_core/oauth.ts:90` | fallback redirect web OAuth | Opcional | `http://localhost:8081` (se ambos faltarem) | sem validacao |
| `VITE_OAUTH_PORTAL_URL` | `scripts/load-env.js:39` | mapeia para `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Opcional | none | somente mapeamento |
| `OWNER_NAME` | `scripts/load-env.js:42` | mapeia para `EXPO_PUBLIC_OWNER_NAME` | Opcional | none | somente mapeamento |
| `REVENUECAT_IOS_API_KEY` | `scripts/load-env.js:43` | mapeia para `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | Opcional | none | somente mapeamento |
| `REVENUECAT_ANDROID_API_KEY` | `scripts/load-env.js:44` | mapeia para `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Opcional | none | somente mapeamento |

### 4.2 Expo public (cliente)

| Variavel | Onde usada (arquivo:linha) | Para que serve | Obrigatoria | Default | Validacao/comportamento |
|---|---|---|---|---|---|
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | `constants/oauth.ts:11`, `constants/oauth.ts:85` | montar URL de login OAuth | Sim para login (web/mobile) | `""` | sem valor, URL de login quebra |
| `EXPO_PUBLIC_OAUTH_SERVER_URL` | `constants/oauth.ts:12`, `constants/oauth.ts:21` | constante exportada (nao consumida no fluxo principal atual) | Opcional | `""` | NAO VERIFICADO no fluxo |
| `EXPO_PUBLIC_APP_ID` | `constants/oauth.ts:13`, `constants/oauth.ts:86` | appId enviado ao portal OAuth | Sim para login | `""` | sem valor, login tende a falhar |
| `EXPO_PUBLIC_OWNER_OPEN_ID` | `constants/oauth.ts:14`, `constants/oauth.ts:23` | metadado owner no cliente | Opcional | `""` | NAO VERIFICADO em runtime |
| `EXPO_PUBLIC_OWNER_NAME` | `constants/oauth.ts:15`, `constants/oauth.ts:24` | metadado owner no cliente | Opcional | `""` | NAO VERIFICADO em runtime |
| `EXPO_PUBLIC_API_BASE_URL` | `constants/oauth.ts:16`, `constants/oauth.ts:33`, `lib/_core/api.ts:35` | base URL da API | Recomendado (principalmente mobile) | `""` | no web tenta derivar hostname (`constants/oauth.ts:38`) |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | `constants/revenuecat.ts:8` | inicializacao RevenueCat iOS | Sim para IAP iOS | `null` | sem valor, provider desabilita compras |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | `constants/revenuecat.ts:11` | inicializacao RevenueCat Android | Sim para IAP Android | `null` | sem valor, provider desabilita compras |

Variavel de build (nao configurada por `.env` normalmente):
- `EXPO_OS` usada em `components/haptic-tab.tsx:10` e `components/external-link.tsx:14`.

### 4.3 `.env` e gitignore

- Arquivo `.env`: **NAO encontrado** na raiz (verificacao local).
- `.gitignore` atual inclui apenas `.env*.local` em `./.gitignore:34`.
- `.gitignore` **nao inclui `.env` explicitamente**.  
Status: **RISCO CRITICO** (pode ocorrer commit acidental de segredo).

---

## 5) Dependencias externas (fora do repo) e configuracao

| Dependencia externa | Onde aparece | Como configurar |
|---|---|---|
| OAuth server (externo) | `server/_core/sdk.ts:70`, `server/_core/oauth.ts:75` | definir `OAUTH_SERVER_URL`, `VITE_APP_ID`, `EXPO_PUBLIC_OAUTH_PORTAL_URL`; garantir app cadastrado no provedor OAuth |
| Portal OAuth (externo) | `constants/oauth.ts:85` | definir `EXPO_PUBLIC_OAUTH_PORTAL_URL` (ou `VITE_OAUTH_PORTAL_URL` para mapeamento) |
| Banco MySQL/TiDB | `server/db.ts:23`, `drizzle.config.ts:3` | definir `DATABASE_URL`; rodar `corepack pnpm db:push` |
| Gemini API | `server/_core/llm.ts:418`, `server/_core/llm.ts:337` | definir `GEMINI_API_KEY` e modelos opcionais |
| Proxy storage/Forge | `server/storage.ts:9`, `server/_core/dataApi.ts:20` | definir `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY` |
| RevenueCat | `lib/purchases-provider.tsx:48`, `server/_core/revenuecat.ts:50` | configurar keys `EXPO_PUBLIC_REVENUECAT_*`, produtos no dashboard, webhook apontando para `/api/revenuecat/webhook` e secret bearer |

---

## 6) Fake / Stub / Hardcoded encontrados

| Tipo | Evidencia | Impacto |
|---|---|---|
| Teste skip com TODO | `tests/auth.logout.test.ts:46` (`describe.skip`) | cobertura de logout incompleta |
| Mock em teste de integracao | `tests/artifacts.generate.integration.test.ts:9` (`vi.mock("../server/db"...)`) | esperado para teste; nao e problema de runtime |
| Sessao revisao com conteudo placeholder | `app/review-session.tsx:24` (comentario "Fetch artifact content...") e `app/review-session.tsx:119` (`Flashcard #artifactId`) | UX de revisao nao mostra frente/verso real |
| Hardcoded bundle id | `constants/oauth.ts:6`, `app.config.ts:9` | acoplamento a id fixo; revisar antes de multi-ambiente |
| Hardcoded logo URL | `app.config.ts:35` | dependencia de asset externo fixo |
| TODOs de template em doc interno | `server/README.md:664`, `server/README.md:760`, `server/README.md:784` | ruido documental, nao runtime |

Itens marcados como NAO VERIFICADO:
- Se `EXPO_PUBLIC_OAUTH_SERVER_URL` e `EXPO_PUBLIC_OWNER_*` sao usados por algum fluxo de produto final (na base atual, aparecem como exports).

---

## 7) Banco e migracoes (Passo 5)

### 7.1 Comparacao schema x migracoes

Arquivos:
- `drizzle/schema.ts`
- `drizzle/0000_elite_eternals.sql`
- `drizzle/0001_yellow_karnak.sql`
- `drizzle/0002_revenuecat_subscriptions.sql`
- `drizzle/0003_gemini_pipeline.sql`

Conferencias:
- Tabela `subscriptions` presente em schema (`drizzle/schema.ts:20`) e migration `0002`.
- Unique `subscriptions.revenueCatId` em schema (`drizzle/schema.ts:33`) e migration (`drizzle/0002_revenuecat_subscriptions.sql:17`).
- Unique `usage_counters(userId,date)` em schema (`drizzle/schema.ts:45`) e migration (`drizzle/0002_revenuecat_subscriptions.sql:25`).
- `chunks.startOffset/endOffset` em schema (`drizzle/schema.ts:81`) e migration (`drizzle/0003_gemini_pipeline.sql:5` e `drizzle/0003_gemini_pipeline.sql:8`).
- `documents.textHash` e `artifacts.sourceHash` presentes em schema (`drizzle/schema.ts:67`, `drizzle/schema.ts:95`) e migration `0003`.

### 7.2 Execucao de migracao

Comando:
- `corepack pnpm db:push`

Resultado:
- **FAIL** com `DATABASE_URL is required to run drizzle commands`.

Conclusao:
- Estrutura de migracoes existe e e coerente com o schema atual.
- Aplicacao de migracao em DB real ficou **NAO VERIFICADA** por falta de `DATABASE_URL`.

---

## 8) Seguranca basica (Passo 6)

### 8.1 Itens OK

- Validacao de input com `zod` em rotas tRPC (ex.: `server/routers.ts:324`, `server/routers.ts:343`, `server/routers.ts:402`, `server/routers.ts:417`).
- Autenticacao base via `protectedProcedure` (`server/_core/trpc.ts:28`).
- Cookie `httpOnly` no backend (`server/_core/cookies.ts:55`).

### 8.2 Riscos encontrados

1. **RISCO CRITICO - `.env` nao ignorado**
- Evidencia: `./.gitignore:34` contem apenas `.env*.local`.
- Impacto: commit acidental de segredos.

2. **RISCO CRITICO - Falta de authorization por ownership de recurso**
- Exemplo: `documents.list` aceita `folderId` e chama `db.getFolderDocuments(input.folderId)` sem filtro por usuario em `server/routers.ts:335` + `server/db.ts:221`.
- Exemplo: `documents.get` retorna por id sem ownership (`server/routers.ts:341`, `server/db.ts:235`).
- Exemplo: `chunks.list` e `artifacts.list` acessam por `documentId` sem ownership (`server/routers.ts:380`, `server/routers.ts:393`, `server/db.ts:265`, `server/db.ts:323`).
- Exemplo: `review.answer` atualiza por `reviewItemId` sem validar dono (`server/routers.ts:440`, `server/db.ts:376`).

3. **RISCO ALTO - CORS aberto com credenciais**
- Evidencia: refletindo qualquer `Origin` em `server/_core/index.ts:35` e `Access-Control-Allow-Credentials: true` em `server/_core/index.ts:45`.
- Impacto: superficie para CSRF e abuso cross-site.

4. **RISCO ALTO - Webhook RevenueCat fraco**
- Evidencia: valida apenas bearer token opcional (`server/_core/revenuecat.ts:52`); sem assinatura criptografica/timestamp/replay.
- Impacto: spoof/replay se endpoint exposto e secret vazar/ausente.

5. **RISCO MEDIO - Upload sem validacao forte de MIME**
- Evidencia: `documents.upload` recebe `mimeType: z.string()` (`server/routers.ts:349`), sem whitelist de tipos.
- Impacto: payloads inesperados (mesmo com limite de tamanho em `server/_core/extraction.ts:36`).

6. **RISCO MEDIO - Sem rate limit**
- Busca por rate-limit/throttle nao encontrou mecanismo em runtime.
- Impacto: abuso de endpoints (OCR/LLM/webhook/auth).

---

## 9) Teste manual ponta-a-ponta (Passo 4)

### 9.1 O que foi testado

- Backend subiu via `corepack pnpm dev:server` (processo temporario) e respondeu:
  - `GET /api/health` -> `200` com `{"ok":true,...}`.
- tRPC publico respondeu:
  - `system.health` -> `{"ok":true}`.

### 9.2 O que NAO foi possivel comprovar

- Login real OAuth (web/mobile) com provedor externo.
- Upload real + OCR + artefatos com LLM real.
- Fluxo completo UI (pasta/upload/resultados/ver fonte/revisao) em execucao real.

Bloqueadores objetivos:
- Falta de chaves/servicos externos configurados (`DATABASE_URL`, `OAUTH_SERVER_URL`, `GEMINI_API_KEY`, `BUILT_IN_FORGE_*`, RevenueCat keys).
- `corepack pnpm dev` falha no ambiente por script que invoca `pnpm` internamente sem garantia de PATH (`package.json:7`).

---

## 10) Erros encontrados e como corrigir

1. `corepack pnpm db:push` falha:
- Erro: `DATABASE_URL is required to run drizzle commands`.
- Correcao: preencher `DATABASE_URL` no `.env` e rerodar `corepack pnpm db:push`.

2. `corepack pnpm dev` falha:
- Erro: `'pnpm' nao e reconhecido` nos subprocessos do `concurrently`.
- Causa: scripts `dev` chamam `pnpm` diretamente dentro do comando.
- Correcao recomendada:
  - trocar `dev` para chamar `corepack pnpm dev:server` e `corepack pnpm dev:metro`, ou
  - garantir `pnpm` no PATH global do ambiente.

3. Lint com warnings:
- 53 warnings (sem erros), incluindo imports duplicados e vars nao usadas.
- Correcao: executar limpeza incremental por arquivo sem impacto funcional.

---

## 11) Proximos passos priorizados (P0/P1/P2)

### P0 (bloqueios e seguranca)

1. Incluir `.env` no `.gitignore` imediatamente.
2. Implementar authorization por ownership em todas as rotas por `userId`/join de ownership.
3. Restringir CORS com allowlist real (nao refletir origem arbitraria com credenciais).
4. Endurecer webhook RevenueCat:
   - exigir secret sempre em prod,
   - validar assinatura oficial/timestamp,
   - protecao contra replay.
5. Corrigir script `dev` para funcionar em ambientes sem `pnpm` global.

### P1 (confiabilidade funcional)

1. Corrigir logica de `review.answer` para usar estado atual do review item (nao resetar EF/interval/streak).
2. Fazer `review-session` renderizar frente/verso real do flashcard (buscar artifact content).
3. Validar whitelist de MIME e limites por tipo de arquivo no upload.
4. Rodar E2E manual real apos preencher env (login -> upload -> resultados -> ver fonte -> revisao).

### P2 (qualidade/observabilidade)

1. Reduzir warnings de lint (imports duplicados, unused vars, BOM).
2. Ativar teste de logout (remover `describe.skip`).
3. Adicionar testes de autorizacao por ownership.
4. Documentar matriz de ambientes (dev/staging/prod) e secrets por plataforma.

---

## 12) Arquivos gerados/atualizados nesta auditoria

- `.env.example` (novo, sem segredos reais)
- `docs/audit.md` (este relatorio)

