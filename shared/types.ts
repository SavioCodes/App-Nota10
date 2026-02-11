/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ─── App-specific types ───

export type SubscriptionPlan = "free" | "pro" | "pro_enem";
export type DocumentStatus = "uploading" | "extracting" | "generating" | "ready" | "error";
export type OcrConfidence = "high" | "medium" | "low";
export type ArtifactType = "summary" | "content_map" | "flashcard" | "question";
export type ArtifactMode = "faithful" | "deepened" | "exam";
export type FlashcardLevel = "definition" | "cause_effect" | "comparison" | "example" | "trick";

export interface SummaryContent {
  text: string;
  isComplement: boolean;
  notFoundInMaterial?: boolean;
}

export interface ContentMapContent {
  title: string;
  topics: Array<{
    title: string;
    subtopics: string[];
    sourceChunkIds: number[];
  }>;
}

export interface FlashcardContent {
  front: string;
  back: string;
  level: FlashcardLevel;
  isComplement: boolean;
  notFoundInMaterial?: boolean;
}

export interface QuestionContent {
  question: string;
  options: string[];
  correctAnswer: string;
  justification: string;
  isComplement: boolean;
  notFoundInMaterial?: boolean;
}
