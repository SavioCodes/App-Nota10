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
