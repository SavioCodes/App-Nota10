import { z } from "zod";

export const sectionSchema = z.enum(["FIEL", "COMPLEMENTO"]);
export const flashcardLevelSchema = z.enum([
  "definition",
  "cause_effect",
  "comparison",
  "example",
  "trick",
]);

export const summaryContentSchema = z.object({
  text: z.string().min(1),
  isComplement: z.boolean().optional().default(false),
  section: sectionSchema.optional(),
  notFoundInMaterial: z.boolean().optional().default(false),
});

export const contentMapTopicSchema = z.object({
  title: z.string().min(1),
  subtopics: z.array(z.string()).default([]),
  sourceChunkIds: z.array(z.number().int().positive()).optional(),
  section: sectionSchema.optional(),
  isComplement: z.boolean().optional(),
});

export const contentMapContentSchema = z.object({
  title: z.string().min(1),
  topics: z.array(contentMapTopicSchema).default([]),
  notFoundInMaterial: z.boolean().optional().default(false),
});

export const flashcardContentSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  level: flashcardLevelSchema.optional(),
  difficultyTag: flashcardLevelSchema.optional(),
  isComplement: z.boolean().optional().default(false),
  section: sectionSchema.optional(),
  notFoundInMaterial: z.boolean().optional().default(false),
});

export const questionContentSchema = z.object({
  type: z.enum(["multiple_choice", "open"]).optional(),
  prompt: z.string().optional(),
  question: z.string().min(1),
  options: z.array(z.string()).default([]),
  correctAnswer: z.string().default(""),
  answerKey: z.string().optional(),
  justification: z.string().default(""),
  rationaleShort: z.string().optional(),
  isComplement: z.boolean().optional().default(false),
  section: sectionSchema.optional(),
  notFoundInMaterial: z.boolean().optional().default(false),
});

export const artifactModeSchema = z.enum(["faithful", "deepened", "exam"]);
export const artifactTypeSchema = z.enum(["summary", "content_map", "flashcard", "question"]);
