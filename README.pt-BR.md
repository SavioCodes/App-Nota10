# Nota10

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/SavioCodes/App-Nota10/actions/workflows/ci.yml/badge.svg)](https://github.com/SavioCodes/App-Nota10/actions/workflows/ci.yml)

Plataforma de estudo assistida por IA, construída com Expo + React Native (web/mobile) e backend Express + tRPC.

- Versão em inglês: [`README.md`](./README.md)

## Visão Geral

O Nota10 transforma material bruto (imagem/PDF) em artefatos de estudo:

- resumos
- mapas de conteúdo
- flashcards
- questões de prova

Fluxo principal:

1. Upload de imagem/PDF
2. Extração de texto (OCR/PDF nativo)
3. Chunking + hash do conteúdo
4. Geração de artefatos (`faithful`, `deepened`, `exam`)
5. Revisão com repetição espaçada (SM-2)

## Stack Técnica

- Frontend: Expo Router, React Native, NativeWind, React Query, tRPC client
- Backend: Express, tRPC, Drizzle ORM, MySQL/TiDB, Zod
- IA: Gemini (perfil rápido + estrito)
- Billing: RevenueCat
- Tooling: TypeScript strict, ESLint, Vitest, Drizzle Kit

## Estrutura do Projeto

```text
app/                # Wrappers de rota (Expo Router)
features/           # Módulos de features UI
components/         # Componentes reutilizáveis
server/             # API, serviços e repositórios DB
shared/             # Contratos, schemas e constantes compartilhadas
drizzle/            # Schema e migrações SQL
tests/              # Testes unitários/integração
docs/               # Documentação técnica
```

Mapa completo: [`docs/PROJECT-STRUCTURE.md`](./docs/PROJECT-STRUCTURE.md)

## Início Rápido

### 1) Requisitos

- Node.js 22+
- Corepack habilitado
- pnpm 9.x
- Instância MySQL/TiDB

### 2) Instalação

```bash
corepack pnpm install
```

### 3) Configurar ambiente

```bash
cp .env.example .env
```

Preencha variáveis obrigatórias (database, OAuth, Gemini, storage e RevenueCat).

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

Gerar/aplicar migrações:

```bash
corepack pnpm db:push
```

Schema fonte: [`drizzle/schema.ts`](./drizzle/schema.ts)

## Documentação Técnica

- Arquitetura: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- Referência de API: [`docs/API.md`](./docs/API.md)
- Guia de uso: [`docs/USAGE.md`](./docs/USAGE.md)
- Runbook operacional: [`docs/RUNBOOK.md`](./docs/RUNBOOK.md)
- Política de segurança: [`SECURITY.md`](./SECURITY.md)
- Guia de contribuição: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

## Observações

- `server/db.ts` e `server/routers.ts` continuam como barrels de compatibilidade.
- A lógica de domínio agora está em:
  - `server/db/*.repo.ts`
  - `server/services/*.service.ts`
  - `server/routers/*.router.ts`
  - `features/*`

## Licença

MIT. Consulte [`LICENSE`](./LICENSE).
