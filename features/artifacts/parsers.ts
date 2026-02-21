import type {
  ContentMapContent,
  FlashcardContent,
  QuestionContent,
  SummaryContent,
} from "@shared/types";
import {
  contentMapContentSchema,
  flashcardContentSchema,
  questionContentSchema,
  summaryContentSchema,
} from "@shared/schemas/artifacts";

export type ArtifactRecord = {
  id: number;
  type: "summary" | "content_map" | "flashcard" | "question";
  content: unknown;
  sourceChunkIds?: unknown;
};

export function toSourceIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export function toSummaryContent(value: unknown): SummaryContent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SummaryContent>;
  const normalized = {
    text: typeof candidate.text === "string" ? candidate.text : "",
    isComplement: Boolean(candidate.isComplement),
    section: candidate.section,
    notFoundInMaterial: Boolean(candidate.notFoundInMaterial),
  };
  const parsed = summaryContentSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export function toContentMap(value: unknown): ContentMapContent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ContentMapContent>;
  const normalized = {
    title: typeof candidate.title === "string" ? candidate.title : "Mapa de Conteudo",
    topics: Array.isArray(candidate.topics)
      ? candidate.topics
          .map((topic) => {
            if (!topic || typeof topic !== "object") return null;
            const rawTopic = topic as Partial<ContentMapContent["topics"][number]>;
            if (typeof rawTopic.title !== "string" || rawTopic.title.trim().length === 0) return null;
            return {
              title: rawTopic.title,
              subtopics: Array.isArray(rawTopic.subtopics)
                ? rawTopic.subtopics.filter((sub): sub is string => typeof sub === "string")
                : [],
              sourceChunkIds: toSourceIds(rawTopic.sourceChunkIds),
              section: rawTopic.section,
              isComplement: Boolean(rawTopic.isComplement),
            };
          })
          .filter((topic): topic is NonNullable<typeof topic> => topic !== null)
      : [],
    notFoundInMaterial: Boolean(candidate.notFoundInMaterial),
  };
  const parsed = contentMapContentSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export function toFlashcardContent(value: unknown): FlashcardContent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<FlashcardContent>;
  const normalized = {
    front: typeof candidate.front === "string" ? candidate.front : "",
    back: typeof candidate.back === "string" ? candidate.back : "",
    level: candidate.level,
    difficultyTag: candidate.difficultyTag,
    isComplement: Boolean(candidate.isComplement),
    section: candidate.section,
    notFoundInMaterial: Boolean(candidate.notFoundInMaterial),
  };
  const parsed = flashcardContentSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export function toQuestionContent(value: unknown): QuestionContent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<QuestionContent>;
  const question = typeof candidate.question === "string" ? candidate.question : candidate.prompt;
  if (typeof question !== "string" || question.trim().length === 0) return null;
  const normalized = {
    type: candidate.type,
    prompt: candidate.prompt,
    question,
    options: Array.isArray(candidate.options)
      ? candidate.options.filter((option): option is string => typeof option === "string")
      : [],
    correctAnswer:
      typeof candidate.correctAnswer === "string"
        ? candidate.correctAnswer
        : (candidate.answerKey ?? ""),
    answerKey: candidate.answerKey,
    justification:
      typeof candidate.justification === "string"
        ? candidate.justification
        : (candidate.rationaleShort ?? ""),
    rationaleShort: candidate.rationaleShort,
    isComplement: Boolean(candidate.isComplement),
    section: candidate.section,
    notFoundInMaterial: Boolean(candidate.notFoundInMaterial),
  };
  const parsed = questionContentSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}
