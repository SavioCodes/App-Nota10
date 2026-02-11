import type { StudyMode } from "./llm";

export type SummaryItem = {
  text: string;
  sourceChunkIds: number[];
  isComplement?: boolean;
  section?: "FIEL" | "COMPLEMENTO";
  notFoundInMaterial?: boolean;
};

export type MapTopic = {
  title: string;
  subtopics: string[];
  sourceChunkIds: number[];
  isComplement?: boolean;
  section?: "FIEL" | "COMPLEMENTO";
};

export type ContentMap = {
  title: string;
  topics: MapTopic[];
};

export type FlashcardItem = {
  front: string;
  back: string;
  difficultyTag: string;
  sourceChunkIds: number[];
  isComplement?: boolean;
  section?: "FIEL" | "COMPLEMENTO";
  notFoundInMaterial?: boolean;
};

export type QuestionItem = {
  type: "multiple_choice" | "open";
  prompt: string;
  options?: string[];
  answerKey: string;
  rationaleShort: string;
  sourceChunkIds: number[];
  isComplement?: boolean;
  section?: "FIEL" | "COMPLEMENTO";
  notFoundInMaterial?: boolean;
};

export type ArtifactBundle = {
  summary: SummaryItem[];
  map: ContentMap;
  flashcards: FlashcardItem[];
  questions: QuestionItem[];
};

export type DbArtifactInsert = {
  documentId: number;
  type: "summary" | "content_map" | "flashcard" | "question";
  content: any;
  sourceChunkIds: number[];
  mode: StudyMode;
  sourceHash: string;
};

export function createEmptyArtifactBundle(): ArtifactBundle {
  return {
    summary: [],
    map: {
      title: "Mapa de Conteudo",
      topics: [],
    },
    flashcards: [],
    questions: [],
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function asSourceChunkIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => Math.trunc(item));
  return Array.from(new Set(normalized));
}

function asSection(value: unknown): "FIEL" | "COMPLEMENTO" | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "FIEL" || normalized === "COMPLEMENTO") return normalized;
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

export function parseArtifactBundle(raw: unknown): ArtifactBundle {
  const base = createEmptyArtifactBundle();
  const parsed = asObject(raw);

  const rawSummary = Array.isArray(parsed.summary) ? parsed.summary : [];
  const summary: SummaryItem[] = [];
  for (const item of rawSummary) {
    const entry = asObject(item);
    const text = asString(entry.text);
    if (!text) continue;
    summary.push({
      text,
      sourceChunkIds: asSourceChunkIds(entry.sourceChunkIds),
      isComplement: asBoolean(entry.isComplement),
      section: asSection(entry.section),
      notFoundInMaterial: asBoolean(entry.notFoundInMaterial),
    });
  }
  base.summary = summary;

  const rawMap = asObject(parsed.map ?? parsed.contentMap);
  base.map = {
    title: asString(rawMap.title, "Mapa de Conteudo"),
    topics: (() => {
      const topics: MapTopic[] = [];
      for (const topic of Array.isArray(rawMap.topics) ? rawMap.topics : []) {
        const entry = asObject(topic);
        const title = asString(entry.title);
        if (!title) continue;
        topics.push({
          title,
          subtopics: asStringArray(entry.subtopics),
          sourceChunkIds: asSourceChunkIds(entry.sourceChunkIds),
          isComplement: asBoolean(entry.isComplement),
          section: asSection(entry.section),
        });
      }
      return topics;
    })(),
  };

  const rawFlashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
  const flashcards: FlashcardItem[] = [];
  for (const card of rawFlashcards) {
    const entry = asObject(card);
    const front = asString(entry.front);
    const back = asString(entry.back);
    if (!front || !back) continue;
    flashcards.push({
      front,
      back,
      difficultyTag: asString(entry.difficultyTag || entry.level, "definition"),
      sourceChunkIds: asSourceChunkIds(entry.sourceChunkIds),
      isComplement: asBoolean(entry.isComplement),
      section: asSection(entry.section),
      notFoundInMaterial: asBoolean(entry.notFoundInMaterial),
    });
  }
  base.flashcards = flashcards;

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: QuestionItem[] = [];
  for (const question of rawQuestions) {
    const entry = asObject(question);
    const prompt = asString(entry.prompt || entry.question);
    if (!prompt) continue;

    const typeRaw = asString(entry.type, "multiple_choice");
    const type = typeRaw === "open" ? "open" : "multiple_choice";

    questions.push({
      type,
      prompt,
      options: asStringArray(entry.options),
      answerKey: asString(entry.answerKey || entry.correctAnswer),
      rationaleShort: asString(entry.rationaleShort || entry.justification),
      sourceChunkIds: asSourceChunkIds(entry.sourceChunkIds),
      isComplement: asBoolean(entry.isComplement),
      section: asSection(entry.section),
      notFoundInMaterial: asBoolean(entry.notFoundInMaterial),
    });
  }
  base.questions = questions;

  return base;
}

function normalizeItemSection(
  isComplement: boolean | undefined,
  section: "FIEL" | "COMPLEMENTO" | undefined,
): "FIEL" | "COMPLEMENTO" {
  if (section) return section;
  return isComplement ? "COMPLEMENTO" : "FIEL";
}

function normalizeSourceIds(sourceIds: number[], validChunkIds: Set<number>): number[] {
  return sourceIds.filter((id) => validChunkIds.has(id));
}

function requireSourceForItem(mode: StudyMode, section: "FIEL" | "COMPLEMENTO"): boolean {
  if (mode === "deepened" && section === "COMPLEMENTO") return false;
  return true;
}

export function validateArtifactBundleSources(
  bundle: ArtifactBundle,
  validChunkIds: Set<number>,
  mode: StudyMode,
): ArtifactBundle {
  const normalized: ArtifactBundle = {
    summary: bundle.summary.map((item) => {
      const section = normalizeItemSection(item.isComplement, item.section);
      const sourceChunkIds = normalizeSourceIds(item.sourceChunkIds, validChunkIds);
      const mustHaveSource = requireSourceForItem(mode, section);
      return {
        ...item,
        sourceChunkIds,
        section,
        isComplement: section === "COMPLEMENTO",
        notFoundInMaterial: mustHaveSource && sourceChunkIds.length === 0,
      };
    }),
    map: {
      ...bundle.map,
      topics: bundle.map.topics.map((topic) => {
        const section = normalizeItemSection(topic.isComplement, topic.section);
        return {
          ...topic,
          section,
          isComplement: section === "COMPLEMENTO",
          sourceChunkIds: normalizeSourceIds(topic.sourceChunkIds, validChunkIds),
        };
      }),
    },
    flashcards: bundle.flashcards.map((item) => {
      const section = normalizeItemSection(item.isComplement, item.section);
      const sourceChunkIds = normalizeSourceIds(item.sourceChunkIds, validChunkIds);
      const mustHaveSource = requireSourceForItem(mode, section);
      return {
        ...item,
        sourceChunkIds,
        section,
        isComplement: section === "COMPLEMENTO",
        notFoundInMaterial: mustHaveSource && sourceChunkIds.length === 0,
      };
    }),
    questions: bundle.questions.map((item) => {
      const section = normalizeItemSection(item.isComplement, item.section);
      const sourceChunkIds = normalizeSourceIds(item.sourceChunkIds, validChunkIds);
      const mustHaveSource = requireSourceForItem(mode, section);
      return {
        ...item,
        sourceChunkIds,
        section,
        isComplement: section === "COMPLEMENTO",
        notFoundInMaterial: mustHaveSource && sourceChunkIds.length === 0,
      };
    }),
  };

  return normalized;
}

function aggregateSourceIds(topics: MapTopic[]): number[] {
  const aggregated = topics.flatMap((topic) => topic.sourceChunkIds);
  return Array.from(new Set(aggregated));
}

export function toDbArtifacts(
  bundle: ArtifactBundle,
  params: {
    documentId: number;
    mode: StudyMode;
    sourceHash: string;
  },
): DbArtifactInsert[] {
  const rows: DbArtifactInsert[] = [];

  for (const item of bundle.summary) {
    rows.push({
      documentId: params.documentId,
      type: "summary",
      content: {
        text: item.text,
        section: item.section,
        isComplement: item.isComplement ?? false,
        notFoundInMaterial: item.notFoundInMaterial ?? false,
      },
      sourceChunkIds: item.sourceChunkIds,
      mode: params.mode,
      sourceHash: params.sourceHash,
    });
  }

  const mapSourceChunkIds = aggregateSourceIds(bundle.map.topics);
  rows.push({
    documentId: params.documentId,
    type: "content_map",
    content: {
      title: bundle.map.title,
      topics: bundle.map.topics,
      notFoundInMaterial:
        (params.mode === "faithful" || params.mode === "exam") && mapSourceChunkIds.length === 0,
    },
    sourceChunkIds: mapSourceChunkIds,
    mode: params.mode,
    sourceHash: params.sourceHash,
  });

  for (const card of bundle.flashcards) {
    rows.push({
      documentId: params.documentId,
      type: "flashcard",
      content: {
        front: card.front,
        back: card.back,
        level: card.difficultyTag,
        difficultyTag: card.difficultyTag,
        section: card.section,
        isComplement: card.isComplement ?? false,
        notFoundInMaterial: card.notFoundInMaterial ?? false,
      },
      sourceChunkIds: card.sourceChunkIds,
      mode: params.mode,
      sourceHash: params.sourceHash,
    });
  }

  for (const question of bundle.questions) {
    rows.push({
      documentId: params.documentId,
      type: "question",
      content: {
        type: question.type,
        prompt: question.prompt,
        question: question.prompt,
        options: question.options ?? [],
        answerKey: question.answerKey,
        correctAnswer: question.answerKey,
        rationaleShort: question.rationaleShort,
        justification: question.rationaleShort,
        section: question.section,
        isComplement: question.isComplement ?? false,
        notFoundInMaterial: question.notFoundInMaterial ?? false,
      },
      sourceChunkIds: question.sourceChunkIds,
      mode: params.mode,
      sourceHash: params.sourceHash,
    });
  }

  return rows;
}
