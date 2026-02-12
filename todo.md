# Project TODO

- [x] Configurar tema/cores do app (theme.config.js)
- [x] Adicionar ícones ao icon-symbol.tsx
- [x] Configurar tab bar com 4 abas (Home, Biblioteca, Revisão, Perfil)
- [x] Modelo de dados (Drizzle schema: folders, documents, chunks, artifacts, review_items, usage_counters, subscription_status)
- [x] Migração do banco de dados
- [x] Backend: rotas tRPC (upload, processamento, listagem, revisão)
- [x] Backend: pipeline IA (extração texto, geração resumo/mapa/flashcards/questões)
- [x] Backend: upload de arquivos para S3
- [x] Backend: validação de fontes (modo fidelidade)
- [x] Tela Onboarding (3 slides)
- [x] Tela Login/Cadastro
- [x] Tela Home (grid de ações + recentes)
- [x] Tela Scanner/Upload (câmera + galeria + PDF)
- [x] Tela Biblioteca (pastas/matérias)
- [x] Tela Documentos da Pasta
- [x] Tela Documento (preview texto extraído)
- [x] Tela Resultados (abas: Resumo, Mapa, Flashcards, Questões)
- [x] Toggle de modo (Fiel/Aprofundar/Prova)
- [x] Botão "Ver Fonte" com modal de trecho original
- [x] Flashcard Estudo (swipe acertei/errei)
- [x] Tela Revisão Diária (fila SM-2, streak, tempo estimado)
- [x] Tela Paywall (planos Free/Pro/Pro+ENEM)
- [x] Tela Configurações (exportar PDF, apagar conta, privacidade)
- [x] Lógica de monetização (limites plano gratuito, 3 conversões/dia)
- [x] Exportação PDF
- [x] Qualidade da extração (Alta/Média/Baixa)
- [x] Cache de resultados (não regenerar se documento não mudou)
- [x] Seed/demo: pasta "História" com documento de exemplo (não necessário - app cria pastas dinamicamente)
- [x] README com instruções de deploy
- [x] Gerar logo do app

## Rodada 2 - Correções e Melhorias

- [x] Login/cadastro funcional via OAuth (fluxo completo)
- [x] Garantir que todas as rotas backend funcionem de verdade (não placeholder)
- [x] Exportação PDF funcional (exporta HTML formatado, pode ser salvo como PDF via Print)
- [x] Tela de Política de Privacidade
- [x] Melhorar design geral (mais polido, iOS-like, gradientes, sombras)
- [x] Home screen redesign (mais bonita e funcional)
- [x] Biblioteca redesign
- [x] Revisão redesign
- [x] Perfil redesign
- [x] Onboarding redesign
- [x] Scanner/Upload redesign
- [x] Resultados redesign
- [x] Paywall redesign
- [x] Remover qualquer dado falso/placeholder
- [x] Fluxo completo: foto → OCR → resultados funcionando end-to-end

## Rodada 3 - Dark Theme Premium

- [x] Atualizar theme.config.js com tokens dark neutro (#0B0D10, #12151A, #1A1F26, etc.)
- [x] Atualizar theme.config.d.ts com novos tokens (surface2, textDisabled, focus)
- [x] Forçar tema dark como padrão no ThemeProvider
- [x] Atualizar tab bar (_layout.tsx) para cores dark
- [x] Atualizar Home screen estilos inline para dark
- [x] Atualizar Library screen estilos inline para dark
- [x] Atualizar Review screen estilos inline para dark
- [x] Atualizar Profile screen estilos inline para dark
- [x] Atualizar Onboarding estilos para dark
- [x] Atualizar Scanner estilos para dark
- [x] Atualizar Upload PDF estilos para dark
- [x] Atualizar Folder detail estilos para dark
- [x] Atualizar Document detail estilos para dark
- [x] Atualizar Results screen estilos para dark
- [x] Atualizar Review Session estilos para dark
- [x] Atualizar Paywall estilos para dark
- [x] Atualizar Export PDF estilos para dark
- [x] Atualizar Privacy Policy estilos para dark
- [x] Atualizar app.config.ts splash background para dark
- [x] Verificar 0 erros TypeScript

## Rodada 4 - Modo Claro, Telas de Erro, Correção de Botões

- [x] Adicionar tokens light ao theme.config.js (background #FFFFFF, surface #F5F5F5, etc.)
- [x] Implementar toggle de tema no Perfil (dark/light switch)
- [x] Persistir preferência de tema com AsyncStorage
- [x] Atualizar ThemeProvider para respeitar preferência do usuário
- [x] Criar tela 404 (Not Found)
- [x] Criar tela de erro de conexão (Offline)
- [x] Criar componentes de estado vazio reutilizáveis
- [x] Corrigir todos os botões de voltar (chevron.left visível, contraste adequado)
- [x] Garantir que setas de navegação sejam visíveis em ambos os temas
- [x] Testar alternância de tema em todas as telas

## Rodada 5 - Sistema de Pagamento Real (RevenueCat)

- [x] Instalar react-native-purchases (RevenueCat SDK)
- [x] Criar PurchasesProvider para inicializar RevenueCat
- [x] Adicionar produtos IAP (nota10_pro_monthly, nota10_pro_enem_monthly) no código
- [x] Backend: adicionar tabela subscriptions (userId, plan, status, expiresAt, revenueCatId)
- [x] Backend: endpoint POST /api/revenuecat/webhook para receber eventos do RevenueCat
- [x] Backend: validar assinatura real ao retornar usage.today
- [x] Atualizar Paywall para usar RevenueCat.purchasePackage()
- [x] Atualizar Profile para mostrar plano real do backend
- [x] Atualizar Home para verificar limite real de conversões
- [x] Remover qualquer lógica mockada de plano
- [x] Documentar setup RevenueCat (API keys, produtos, webhook URL)

## Rodada 6 - Gemini 3 (Flash + Pro) e Modo Fiel Confiável

### 6.0 Diagnóstico inicial (estado atual)

- [x] Mapear pipeline atual (upload -> OCR -> chunks -> artifacts) em `server/routers.ts`
- [x] Confirmar estado do LLM atual em `server/_core/llm.ts` (modelo fixo e sem adapter)
- [x] Confirmar schema atual sem hash/offset em `drizzle/schema.ts`
- [x] Confirmar que `results/[id]` já usa `sourceChunkIds` para "Ver fonte"
- [x] Resolver baseline de testes/lint no ambiente local (Vitest falha por PostCSS externo e lint depende de `pnpm` no PATH do `expo lint`)

### 6.1 Infra Gemini + configuração

- [x] Adicionar novas env vars backend em `server/_core/env.ts`:
- [x] `GEMINI_API_KEY`
- [x] `GEMINI_FAST_MODEL` (default `gemini-3-flash-preview`)
- [x] `GEMINI_STRICT_MODEL` (default `gemini-3-pro-preview`)
- [x] `GEMINI_THINKING_LEVEL_FAST` (default `medium`; `high` no modo prova)
- [x] `GEMINI_THINKING_LEVEL_STRICT` (default `high`)
- [x] `MAX_UPLOAD_MB`
- [x] `MAX_PDF_PAGES_OCR`
- [x] Refatorar `server/_core/llm.ts` para adapter trocável com seleção explícita de perfil:
- [x] `fast` -> Flash
- [x] `strict` -> Pro
- [x] Preservar compatibilidade com chamadas existentes durante migração

### 6.2 Extração (imagem/PDF) com controle de custo

- [x] Implementar extração para imagem via Gemini Flash (OCR) retornando texto + confiança (`high|medium|low`)
- [x] PDF: tentar texto nativo primeiro
- [x] PDF: fallback OCR por página quando texto nativo insuficiente
- [x] Limitar OCR por `MAX_PDF_PAGES_OCR`
- [x] Respeitar `MAX_UPLOAD_MB` no upload e retornar erro claro
- [x] Definir resolução de mídia padrão para PDF (`medium`) com opção `high` se baixa qualidade
- [x] Persistir texto extraído no documento com metadados de confiança

### 6.3 Chunking determinístico e idempotência

- [x] Criar módulo de chunking determinístico (ex.: `server/_core/chunker.ts`)
- [x] Tamanho alvo entre ~600-900 chars com overlap pequeno
- [x] Persistir em `chunks`: `chunkOrder`, `textContent`, `startOffset`, `endOffset`
- [x] Adicionar hash do texto extraído no `documents` (ex.: `textHash`)
- [x] Garantir idempotência: se hash igual e chunks já existem, não recriar
- [x] Criar/atualizar migração Drizzle para novos campos/índices

### 6.4 Geração de artifacts (Flash) com contrato forte

- [x] Reestruturar `artifacts.generate` para produzir JSON estruturado:
- [x] `summary`: bullets curtos
- [x] `map`: tópicos/subtópicos
- [x] `flashcards`: `{ front, back, difficultyTag, sourceChunkIds[] }`
- [x] `questions`: `{ type, prompt, options?, answerKey, rationaleShort, sourceChunkIds[] }`
- [x] Em `faithful` e `exam`, exigir `sourceChunkIds` em todos os itens
- [x] Em `deepened`, separar claramente "FIEL" vs "COMPLEMENTO"
- [x] Persistir apenas formato final padronizado no DB para manter UI estável

### 6.5 Validador (Pro) como quality gate

- [x] Criar passo de validação com Gemini Pro após geração Flash
- [x] Verificar que `sourceChunkIds` existem no documento
- [x] Verificar aderência factual ao conteúdo dos chunks citados
- [x] Política de correção:
- [x] tentar corrigir item automaticamente
- [x] se não for possível, marcar `notFoundInMaterial: true`
- [x] Salvar somente artifacts validados/corrigidos

### 6.6 Cache + uso (usage_counters)

- [x] Cache por `documentId + mode + hash` para evitar regenerar conteúdo igual
- [x] Não regenerar artifacts na navegação quando hash for o mesmo
- [x] Debitar `usage_counters` na geração efetiva de artifacts
- [ ] Opcional: debitar adicional para OCR pesado
- [x] Garantir bloqueio Free (3/dia) consistente em upload e `artifacts.generate`
- [x] Manter planos pagos sem limite

### 6.7 UI mínima (sem redesign)

- [x] Garantir compatibilidade de `app/results/[id].tsx` com novos campos de artifacts
- [x] Se não houver highlight por offset, manter fallback exibindo texto do chunk no modal "Ver fonte"
- [x] Garantir que `Home` e `Profile` continuem refletindo plano/limite reais do backend

### 6.8 Testes (Vitest)

- [x] Teste unitário: chunker determinístico
- [x] Teste unitário: validador rejeita item sem fonte ou marca "não encontrado"
- [x] Teste unitário: cache evita 2ª geração para mesmo hash
- [x] Teste integração leve: `artifacts.generate` com mock do adapter LLM
- [x] Ajustar ambiente de teste para não depender de PostCSS externo ao projeto

### 6.9 Documentação

- [x] Atualizar README com:
- [x] setup de `GEMINI_API_KEY`
- [x] estratégia Flash + Pro (custo/velocidade vs validação/precisão)
- [x] limites recomendados (`MAX_UPLOAD_MB`, `MAX_PDF_PAGES_OCR`)
- [x] fluxo de PDFs com texto nativo vs PDFs escaneados
- [x] Incluir troubleshooting específico de custo/limites e falhas de validação

### 6.10 Critério de aceite

- [x] `corepack pnpm check` passando
- [x] `corepack pnpm lint` passando de forma real (sem falso positivo por falta de `pnpm` no PATH interno)
- [x] `corepack pnpm test` passando
- [ ] Geração de artifacts de documento exemplo funcionando (`summary/map/flashcards/questions`)
- [x] No modo `faithful`, todos os itens com `sourceChunkIds` válidos ou marcados `notFoundInMaterial`
- [x] Limite do plano grátis bloqueando corretamente

## Rodada 7 - Hardening (Segurança + Confiabilidade)

### 7.1 Ambiente e execução

- [x] Adicionar `.env` ao `.gitignore` para evitar commit acidental de segredos
- [x] Corrigir script `dev` para funcionar sem depender de `pnpm` global no subprocesso
- [x] Corrigir `dev:metro` para porta válida no Windows (remover `${EXPO_PORT:-8081}`)
- [x] Tornar plugin `react-native-purchases` opcional no `app.config.ts` para não quebrar `expo start` quando plugin não estiver resolvível

### 7.2 Autorização por ownership (backend)

- [x] Restringir `documents.list(folderId)` ao dono da pasta/documento
- [x] Restringir `documents.get(id)` ao dono do documento
- [x] Restringir `chunks.list(documentId)` ao dono do documento
- [x] Restringir `artifacts.list(documentId)` ao dono do documento
- [x] Restringir `artifacts.generate(documentId)` ao dono do documento
- [x] Restringir `review.initForDocument(documentId)` ao dono do documento
- [x] Validar ownership de `folderId` em `documents.upload`

### 7.3 Revisão espaçada

- [x] Corrigir `review.answer` para usar estado atual do `review_item` (easeFactor/interval/streak)
- [x] Garantir update de revisão filtrando por `userId`

### 7.4 Validação após mudanças

- [x] `corepack pnpm check`
- [x] `corepack pnpm lint` (sem erros, warnings conhecidos)
- [x] `corepack pnpm test`

### 7.5 Próximos passos (pendentes)

- [ ] Endurecer webhook RevenueCat com validação forte de assinatura + proteção contra replay
- [x] Restringir CORS com allowlist explícita (evitar reflection com credentials)
- [ ] Teste E2E real com `.env` completo (OAuth + DB + Gemini + upload + resultados + revisão)

### 7.6 Baseline atual (mapeamento do app)

- [x] Frontend (Expo Router) mapeado:
- [x] abas em `app/(tabs)` e fluxos principais em `app/scanner.tsx`, `app/upload-pdf.tsx`, `app/results/*`, `app/review-session.tsx`, `app/paywall.tsx`
- [x] providers e estado global mapeados em `lib/theme-provider.tsx` e `lib/purchases-provider.tsx`
- [x] Backend (Express + tRPC) mapeado:
- [x] entrada HTTP em `server/index.ts` e composição de rotas em `server/routers.ts`
- [x] domínios principais: `auth`, `folders`, `documents`, `chunks`, `artifacts`, `review`, `usage`, `subscription`
- [x] Banco (Drizzle/MySQL) mapeado:
- [x] tabelas centrais em `drizzle/schema.ts` (`documents`, `chunks`, `artifacts`, `review_items`, `usage_counters`, `subscriptions`)
- [x] Pipeline mapeado:
- [x] ingestão -> extração -> chunking -> geração de artifacts -> validação -> revisão
- [x] Dependências externas mapeadas:
- [x] Gemini (Flash/Pro), RevenueCat, storage S3/proxy upload, OAuth provider externo

## Rodada 8 - Plano de Execução (Próximos Passos)

### 8.0 Objetivo da rodada

- [ ] Fechar lacunas críticas de segurança e confiabilidade
- [ ] Validar o fluxo real ponta-a-ponta com ambiente completo
- [ ] Preparar base para evolução sem regressão

### 8.1 P0 - Segurança e backend crítico

- [x] RevenueCat webhook:
- [ ] validar assinatura real do provedor (não apenas bearer)
- [x] validar timestamp/nonce para anti-replay
- [x] registrar evento processado para idempotência
- [x] CORS:
- [x] trocar reflexão de `Origin` por allowlist explícita via env (ex.: `CORS_ALLOWED_ORIGINS`)
- [x] manter `credentials: true` somente para origens permitidas
- [x] Upload hardening:
- [x] whitelist de MIME types permitidos (`image/*`, `application/pdf`)
- [x] manter limite de tamanho e retornar erro tipado
- [x] Rate limiting mínimo:
- [x] proteger rotas sensíveis (`upload`, `artifacts.generate`, webhook)
- [x] adicionar testes unitários para guardas de rate-limit e MIME
- [ ] observação: RevenueCat não envia assinatura HMAC nativa no payload; segurança forte fica em segredo bearer + idempotência + janela temporal

### 8.2 P1 - Validação funcional real (E2E)

- [ ] Preparar `.env` completo para ambiente de validação (DB/OAuth/Gemini/RevenueCat)
- [ ] Rodar migração real (`corepack pnpm db:push`) e validar schema aplicado
- [ ] Fluxo E2E completo:
- [ ] login
- [ ] criação de pasta
- [ ] upload imagem/PDF
- [ ] extração -> chunks -> artifacts (`summary/map/flashcards/questions`)
- [ ] abrir "Ver fonte" com chunk correto
- [ ] iniciar sessão de revisão e responder cards
- [ ] Validar critério pendente da Rodada 6:
- [ ] geração de artifacts de documento exemplo funcionando na prática

### 8.3 P2 - Qualidade de produto e DX

- [ ] Revisão:
- [ ] exibir conteúdo real do flashcard na sessão (não apenas `artifactId`)
- [ ] OCR/custo:
- [ ] decidir e implementar débito opcional para OCR pesado
- [ ] Testes:
- [ ] remover `skip` de `auth.logout` e cobrir fluxo completo
- [ ] adicionar testes de autorização por ownership
- [ ] Documentação:
- [ ] atualizar `docs/audit.md` após fechamento de P0/P1
- [ ] manter `README.md` sincronizado com comportamento real de dev/prod

### 8.4 Critério de saída da Rodada 8

- [x] `corepack pnpm check` passando
- [x] `corepack pnpm lint` sem erros
- [x] `corepack pnpm test` passando
- [ ] E2E validado com evidência (comandos + resultado)
- [ ] riscos P0 mitigados e documentados

### 8.5 Ordem de execução recomendada

- [x] 1) Fechar P0 de segurança no backend (webhook/CORS/upload/rate-limit)
- [x] 2) Rodar validação estática (`check` + `lint`) após cada bloco de mudança
- [ ] 3) Preparar `.env` completo e validar conexão real com serviços externos
- [ ] 4) Rodar `db:push` e conferir schema/migrações aplicadas
- [ ] 5) Executar E2E funcional completo (login -> upload -> resultados -> revisão)
- [ ] 6) Ajustar UX mínima pendente (conteúdo real em review-session)
- [ ] 7) Fechar testes faltantes e atualizar documentação final
