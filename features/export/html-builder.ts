import type {
  ContentMapContent,
  FlashcardContent,
  QuestionContent,
  SummaryContent,
} from "@shared/types";

type BuildExportHtmlInput = {
  title: string;
  generatedAt: Date;
  includeSummary: boolean;
  includeMap: boolean;
  includeFlashcards: boolean;
  includeQuestions: boolean;
  summary: SummaryContent[];
  contentMap: ContentMapContent | null;
  flashcards: FlashcardContent[];
  questions: QuestionContent[];
};

export function buildExportHtml(input: BuildExportHtmlInput): string {
  let html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#333;line-height:1.6;}
    h1{color:#6C5CE7;border-bottom:2px solid #6C5CE7;padding-bottom:8px;}
    h2{color:#444;margin-top:32px;}
    .card{background:#f8f9fa;border-radius:8px;padding:16px;margin:8px 0;border-left:3px solid #6C5CE7;}
    .flashcard{display:flex;gap:16px;margin:8px 0;}
    .flashcard .front{flex:1;background:#e8f4fd;padding:12px;border-radius:8px;font-weight:600;}
    .flashcard .back{flex:1;background:#f0f8e8;padding:12px;border-radius:8px;}
    .question{margin:16px 0;padding:16px;background:#f8f9fa;border-radius:8px;}
    .option{padding:6px 12px;margin:4px 0;border-radius:4px;}
    .correct{background:#d4edda;font-weight:600;}
    .justification{margin-top:8px;padding:8px;background:#e8f4fd;border-radius:4px;font-size:.9em;}
    .topic{margin:12px 0;padding:12px;background:#f8f9fa;border-radius:8px;}
    .subtopic{margin-left:16px;padding:4px 0;}
    .footer{margin-top:40px;text-align:center;color:#999;font-size:.8em;}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.8em;font-weight:600;}
    .complement{background:#fff3cd;color:#856404;}
  </style></head><body>`;

  html += `<h1>${input.title}</h1>`;
  html += `<p style="color:#666;">Gerado pelo Nota10 em ${input.generatedAt.toLocaleDateString("pt-BR")}</p>`;

  if (input.includeSummary && input.summary.length > 0) {
    html += "<h2>Resumo</h2>";
    for (const item of input.summary) {
      html += `<div class="card">`;
      if (item.isComplement) {
        html += `<span class="badge complement">Complemento</span> `;
      }
      html += `${item.text}</div>`;
    }
  }

  if (input.includeMap && input.contentMap) {
    html += "<h2>Mapa de Conteudo</h2>";
    html += `<h3>${input.contentMap.title}</h3>`;
    for (const topic of input.contentMap.topics) {
      html += `<div class="topic"><strong>${topic.title}</strong>`;
      for (const subtopic of topic.subtopics) {
        html += `<div class="subtopic">- ${subtopic}</div>`;
      }
      html += `</div>`;
    }
  }

  if (input.includeFlashcards && input.flashcards.length > 0) {
    html += `<h2>Flashcards (${input.flashcards.length})</h2>`;
    for (const card of input.flashcards) {
      html += `<div class="flashcard"><div class="front">${card.front}</div><div class="back">${card.back}</div></div>`;
    }
  }

  if (input.includeQuestions && input.questions.length > 0) {
    html += `<h2>Questoes (${input.questions.length})</h2>`;
    input.questions.forEach((question, index) => {
      html += `<div class="question"><strong>Questao ${index + 1}:</strong> ${question.question}`;
      for (const option of question.options) {
        const isCorrect = option === question.correctAnswer;
        html += `<div class="option ${isCorrect ? "correct" : ""}">${option}</div>`;
      }
      html += `<div class="justification"><strong>Justificativa:</strong> ${question.justification}</div>`;
      html += `</div>`;
    });
  }

  html += `<div class="footer">Gerado pelo Nota10 - estude com inteligencia</div>`;
  html += "</body></html>";

  return html;
}
