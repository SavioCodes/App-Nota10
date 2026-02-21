# Project TODO (Status Consolidado)

Data da consolidação: 2026-02-21

## Legenda

- [x] Concluído
- [ ] Pendente bloqueado por ambiente externo (credenciais/serviços)

## 1) Entregas concluídas no código e no repositório

### Produto e fluxo principal

- [x] Pipeline completo upload -> extração -> chunks -> geração -> revisão
- [x] Modos `faithful`, `deepened`, `exam` funcionando com contratos consistentes
- [x] Revisão com conteúdo real de flashcards (sem placeholder `artifactId`)
- [x] Sincronização de revisão idempotente por documento/usuário
- [x] Exportação HTML funcional (mobile + web)

### Backend

- [x] Rotas tRPC por domínio:
  - [x] `auth`
  - [x] `folders`
  - [x] `documents`
  - [x] `chunks`
  - [x] `artifacts`
  - [x] `review`
  - [x] `usage`
- [x] Serviços extraídos:
  - [x] `artifact-generation.service.ts`
  - [x] `review-sync.service.ts`
  - [x] `usage-limits.service.ts`
- [x] Camada DB modularizada por repositórios:
  - [x] `users.repo.ts`
  - [x] `subscriptions.repo.ts`
  - [x] `folders.repo.ts`
  - [x] `documents.repo.ts`
  - [x] `artifacts.repo.ts`
  - [x] `review.repo.ts`
  - [x] `usage.repo.ts`
- [x] Compatibilidade preservada em:
  - [x] `server/routers.ts` (composição)
  - [x] `server/db.ts` (barrel)

### Segurança e confiabilidade

- [x] CORS com allowlist explícita por env (sem reflection insegura)
- [x] Rate limiting para upload, geração e webhook
- [x] Hardening de upload (MIME + tamanho)
- [x] Webhook RevenueCat com:
  - [x] bearer secret
  - [x] janela temporal anti-replay
  - [x] idempotência por `eventId`

### Frontend e organização

- [x] Telas grandes de estudo/export/revisão modularizadas em `features/*`
- [x] Wrappers finos em `app/*` preservando rotas públicas
- [x] Parsers de artifacts centralizados e reutilizados

### Shared contracts

- [x] Schemas runtime-safe com Zod em `shared/schemas/artifacts.ts`
- [x] Tipos compartilhados atualizados sem quebra pública

### Testes e qualidade

- [x] `corepack pnpm check` verde
- [x] `corepack pnpm lint` verde
- [x] `corepack pnpm test` verde
- [x] Testes de regressão adicionados para:
  - [x] parsers de artifacts
  - [x] serviço de sincronização de revisão
  - [x] fluxo de revisão (front/back + SM-2 + init)
  - [x] logout sem `skip`

### Documentação e DevEx

- [x] README principal em inglês (`README.md`)
- [x] README em português (`README.pt-BR.md`)
- [x] Pacote de docs técnicos:
  - [x] `docs/ARCHITECTURE.md`
  - [x] `docs/PROJECT-STRUCTURE.md`
  - [x] `docs/USAGE.md`
  - [x] `docs/API.md`
  - [x] `docs/RUNBOOK.md`
- [x] `CONTRIBUTING.md`
- [x] `CHANGELOG.md`
- [x] `server/README.md` realinhado ao projeto (removido template legado)
- [x] CI em GitHub Actions (`.github/workflows/ci.yml`) com gates:
  - [x] install
  - [x] check
  - [x] lint
  - [x] test

### Git/GitHub

- [x] Refatoração completa aplicada na `main`
- [x] Histórico com commits convencionais e claros
- [x] Branch temporária de refatoração já incorporada e removida

---

## 2) Itens decididos tecnicamente (sem pendência real)

- [x] Assinatura HMAC nativa de webhook RevenueCat:
  - [x] N/A no formato atual do provedor para este endpoint
  - [x] Estratégia adotada: bearer secret + anti-replay + idempotência

- [x] Débito adicional por OCR pesado:
  - [x] Mantido como decisão de produto para próxima rodada (não obrigatório para confiabilidade atual)

---

## 3) Pendências bloqueadas por ambiente externo (E2E real)

- [ ] Preparar `.env` real completo (OAuth + DB + Gemini + RevenueCat + storage)
- [ ] Rodar migração real em ambiente alvo (`corepack pnpm db:push`) e validar schema aplicado
- [ ] Executar E2E real com evidência:
  - [ ] login OAuth real
  - [ ] criação/seleção de pasta
  - [ ] upload imagem/PDF real
  - [ ] extração + geração (`summary/map/flashcards/questions`)
  - [ ] abrir "Ver fonte" com chunks reais
  - [ ] revisão completa com respostas
  - [ ] validação de plano/uso via RevenueCat em cenário real

---

## 4) O que preciso de você para zerar 100%

Para concluir os itens bloqueados acima, preciso destes acessos/dados:

1. `DATABASE_URL` do ambiente alvo (staging/produção de teste).
2. Credenciais OAuth válidas:
   - `VITE_APP_ID`
   - `OAUTH_SERVER_URL`
   - `EXPO_PUBLIC_OAUTH_PORTAL_URL`
3. Chave Gemini válida (`GEMINI_API_KEY`).
4. Credenciais de storage/proxy:
   - `BUILT_IN_FORGE_API_URL`
   - `BUILT_IN_FORGE_API_KEY`
5. RevenueCat de validação:
   - webhook secret
   - API keys de app (iOS/Android, se for validar mobile)
   - produto(s)/entitlement(s) ativos para teste
6. Confirmação do ambiente de execução E2E:
   - web apenas, mobile apenas, ou ambos

Assim que você enviar isso, eu executo o ciclo E2E final e fecho o TODO em 100% com evidências.
