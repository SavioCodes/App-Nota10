# Nota10 — Design do Aplicativo Móvel

## Paleta de Cores

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| primary | #6C5CE7 | #A29BFE | Cor de destaque principal (botões, links, abas ativas) |
| background | #FFFFFF | #0F0F14 | Fundo de telas |
| surface | #F4F3FF | #1A1A24 | Cards, superfícies elevadas |
| foreground | #1A1A2E | #F0F0F5 | Texto principal |
| muted | #7C7C8A | #9E9EAF | Texto secundário |
| border | #E8E7F0 | #2D2D3D | Bordas e divisores |
| success | #00C48C | #4ADE80 | Acerto, streak, qualidade alta |
| warning | #FFB020 | #FBBF24 | Qualidade média, avisos |
| error | #FF4757 | #F87171 | Erros, qualidade baixa |

## Lista de Telas

1. **Splash** — Logo animada "Nota10" com gradiente roxo
2. **Onboarding (3 telas)** — Swipe horizontal: "Fiel ao Material", "Questões de Prova", "Revisão Espaçada"
3. **Login/Cadastro** — Botões "Entrar com E-mail" e "Entrar com Google" (Manus OAuth)
4. **Home** — Grid 2x2 com botões: Escanear, Enviar PDF, Minhas Pastas, Revisão de Hoje
5. **Scanner** — Câmera fullscreen com overlay de recorte, botão de captura, galeria
6. **Biblioteca (Pastas)** — Lista de matérias/pastas com busca no topo, FAB para nova pasta
7. **Documentos da Pasta** — Lista de documentos dentro de uma pasta, com preview e data
8. **Tela Documento** — Preview do texto extraído, título, data, matéria, badge de qualidade OCR
9. **Tela Resultados** — Abas: Resumo Fiel | Mapa | Flashcards | Questões. Toggle de modo (Fiel/Aprofundar/Prova)
10. **Flashcard Estudo** — Swipe cards com "Acertei/Errei", progresso no topo
11. **Revisão Diária** — Fila de revisão com tempo estimado, streak, meta diária
12. **Paywall** — Planos Free/Pro/Pro+ENEM com features comparativas
13. **Configurações** — Exportar PDF, apagar conta/dados, privacidade, tema

## Conteúdo e Funcionalidade por Tela

### Home
- Saudação "Olá, {nome}" no topo
- Streak de dias consecutivos
- 4 cards de ação: Escanear (câmera), Enviar PDF, Minhas Pastas, Revisão de Hoje
- Seção "Recentes" com últimos 3 documentos processados

### Tela Resultados (principal)
- Toggle de modo no topo: FIEL (padrão) | APROFUNDAR | PROVA
- 4 abas: Resumo | Mapa | Flashcards | Questões
- Cada item do resumo tem botão "Ver fonte" que abre modal com trecho original destacado
- Flashcards: swipe horizontal, níveis (definição, causa/efeito, comparação, exemplo, pegadinha)
- Questões: seletor de quantidade (10/20/40), gabarito com justificativa curta + "Ver fonte"

### Revisão Diária
- Cards pendentes para hoje (algoritmo SM-2)
- Tempo estimado (2min por card)
- Streak visual (dias consecutivos)
- Botão "Começar Revisão"

## Fluxos de Usuário Principais

1. **Upload → Resultado**: Home → Escanear/PDF → Confirmação → Processando (loading) → Tela Resultados
2. **Estudo de Flashcards**: Tela Resultados → Aba Flashcards → Swipe (Acertei/Errei) → Resumo de desempenho
3. **Revisão Diária**: Home → Revisão de Hoje → Flashcard por flashcard → Resumo
4. **Ver Fonte**: Qualquer item → "Ver fonte" → Modal com trecho original destacado
5. **Paywall**: Atingir limite (3/dia) → Paywall → Escolher plano

## Navegação

- Tab Bar com 4 abas: Home | Biblioteca | Revisão | Perfil
- Stack navigation dentro de cada tab
- Modais para: Ver Fonte, Paywall, Scanner
