# Nota10

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/SavioCodes/App-Nota10/actions/workflows/ci.yml/badge.svg)](https://github.com/SavioCodes/App-Nota10/actions/workflows/ci.yml)

Plataforma de estudo com IA, feita com Expo + React Native (web/mobile) e backend Express + tRPC.

- Versao em ingles: [`README.md`](./README.md)

## Visao Geral

O Nota10 transforma material bruto (imagem/PDF) em artefatos de estudo:

- resumos
- mapas de conteudo
- flashcards
- questoes de prova

Fluxo principal:

1. Upload de imagem/PDF
2. Extracao de texto (OCR/PDF nativo)
3. Chunking + hash do conteudo
4. Geracao de artefatos (`faithful`, `deepened`, `exam`)
5. Revisao com repeticao espacada (SM-2)

## Stack Tecnica

- Frontend: Expo Router, React Native, NativeWind, React Query, tRPC client
- Backend: Express, tRPC, Drizzle ORM, Supabase Postgres, Zod
- IA: Gemini (perfil rapido + estrito)
- Billing: Mercado Pago (checkout web)
- Tooling: TypeScript strict, ESLint, Vitest, Drizzle Kit

## Estrutura do Projeto

```text
app/                # Wrappers de rota (Expo Router)
features/           # Modulos de features UI
components/         # Componentes reutilizaveis
server/             # API, servicos e repositorios DB
shared/             # Contratos, schemas e constantes compartilhadas
drizzle/            # Schema e migracoes SQL
tests/              # Testes unitarios/integracao
docs/               # Documentacao tecnica
```

Mapa completo: [`docs/PROJECT-STRUCTURE.md`](./docs/PROJECT-STRUCTURE.md)

## Inicio Rapido

### 1) Requisitos

- Node.js 22+
- Corepack habilitado
- pnpm 9.x
- Instancia Supabase Postgres

### 2) Instalacao

```bash
corepack pnpm install
```

### 3) Configurar ambiente

```bash
cp .env.example .env
```

Preencha variaveis obrigatorias (database, OAuth, Gemini, storage e Mercado Pago).

### 4) Rodar em desenvolvimento

```bash
corepack pnpm dev
```

## Gates de Qualidade

```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```

## Banco de Dados

Sincronizar schema:

```bash
corepack pnpm db:push
```

Gerar SQL de migracao (opcional):

```bash
corepack pnpm db:generate
```

Schema fonte: [`drizzle/schema.ts`](./drizzle/schema.ts)

## Documentacao Tecnica

- Arquitetura: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- Referencia de API: [`docs/API.md`](./docs/API.md)
- Guia de uso: [`docs/USAGE.md`](./docs/USAGE.md)
- Runbook operacional: [`docs/RUNBOOK.md`](./docs/RUNBOOK.md)
- Politica de seguranca: [`SECURITY.md`](./SECURITY.md)
- Guia de contribuicao: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## Observacoes

- `server/db.ts` e `server/routers.ts` seguem como barrels de compatibilidade.
- A logica de dominio esta em:
  - `server/db/*.repo.ts`
  - `server/services/*.service.ts`
  - `server/routers/*.router.ts`
  - `features/*`

## Licenca

MIT. Consulte [`LICENSE`](./LICENSE).
