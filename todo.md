# Nota10 - TODO Consolidado

Data: 2026-02-21

Legenda:
- [x] Concluido
- [ ] Pendente por credenciais/servicos externos

## 1) Entregas tecnicas concluidas (sem depender de API key)

### Arquitetura e qualidade
- [x] Refatoracao por dominios no backend (routers + services + db repos)
- [x] Frontend modularizado em `features/*` com wrappers finos em `app/*`
- [x] Tipagem e contratos compartilhados estabilizados
- [x] CI ativa com gates (`check`, `lint`, `test`)
- [x] `check/lint/test/build` verdes localmente

### Fluxo de estudo e revisao
- [x] Pipeline upload -> extracao -> geracao -> revisao funcional
- [x] Revisao com frente/verso real (sem placeholder de `artifactId`)
- [x] Semeadura de revisao idempotente por usuario/documento
- [x] Polling e atualizacao de resultados mais robustos

### Produto e UX
- [x] Tela de perfil com politica de privacidade real
- [x] Acao de apagar conta com limpeza de dados no backend
- [x] Paywall usando checkout Mercado Pago

### Billing e legado
- [x] Runtime legado RevenueCat removido (app + server)
- [x] Webhook legado removido
- [x] Dependencias e envs legadas removidas
- [x] Residuos de schema RevenueCat removidos do banco alvo
- [x] `mobileVerifyPurchase` endurecido para nao conceder plano sem validacao real

### Banco e operacao
- [x] `drizzle.config.ts` carregando `.env` por `dotenv/config`
- [x] Script de banco ajustado para `drizzle-kit push` (`pnpm db:push`)

## 2) Pendencias que dependem de credenciais externas

### Obrigatorias para operar em producao
- [ ] Preencher `GEMINI_API_KEY`
- [ ] Habilitar Mercado Pago no ambiente:
  - [ ] `BILLING_MERCADOPAGO_WEB_ENABLED=true`
  - [ ] `MERCADOPAGO_ACCESS_TOKEN`
  - [ ] `MERCADOPAGO_WEBHOOK_SECRET`
  - [ ] `MERCADOPAGO_WEBHOOK_URL`

### Auth real (Supabase)
- [ ] Configurar provider Google no Supabase Auth
- [ ] Configurar provider Apple no Supabase Auth
- [ ] Validar login real Android/iOS com `nota10://oauth/callback`

### Mobile IAP nativo (se for publicar com assinatura digital no app)
- [ ] Implementar validacao server-side Apple
- [ ] Implementar validacao server-side Google Play
- [ ] Integrar compra nativa no app (atualmente checkout Mercado Pago no app abre link externo)

## 3) Checklist de fechamento final (quando credenciais estiverem prontas)

1. Preencher credenciais no `.env`
2. Rodar `corepack pnpm db:push`
3. Rodar `corepack pnpm check && corepack pnpm lint && corepack pnpm test && corepack pnpm build`
4. Executar smoke real:
   - login
   - upload PDF/imagem
   - geracao de artifacts
   - revisao
   - assinatura e webhook Mercado Pago
5. Registrar evidencias finais em `docs/audit.md`
