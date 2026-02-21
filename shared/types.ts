/**
 * Unified type exports.
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// App-specific types

export type SubscriptionPlan = "free" | "pro" | "pro_enem";
export type DocumentStatus = "uploading" | "extracting" | "generating" | "ready" | "error";
export type OcrConfidence = "high" | "medium" | "low";
export type ArtifactType = "summary" | "content_map" | "flashcard" | "question";
export type ArtifactMode = "faithful" | "deepened" | "exam";
export type FlashcardLevel = "definition" | "cause_effect" | "comparison" | "example" | "trick";

export interface SummaryContent {
  text: string;
  isComplement: boolean;
  section?: "FIEL" | "COMPLEMENTO";
  notFoundInMaterial?: boolean;
}

export interface ContentMapTopic {
  title: string;
  subtopics: string[];
  sourceChunkIds?: number[];
  section?: "FIEL" | "COMPLEMENTO";
  isComplement?: boolean;
}

export interface ContentMapContent {
  title: string;
  topics: ContentMapTopic[];
  notFoundInMaterial?: boolean;
}

export interface FlashcardContent {
  front: string;
  back: string;
  level?: FlashcardLevel;
  difficultyTag?: FlashcardLevel;
  isComplement: boolean;
  section?: "FIEL" | "COMPLEMENTO";
  notFoundInMaterial?: boolean;
}

export interface QuestionContent {
  type?: "multiple_choice" | "open";
  prompt?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  answerKey?: string;
  justification: string;
  rationaleShort?: string;
  isComplement: boolean;
  section?: "FIEL" | "COMPLEMENTO";
  notFoundInMaterial?: boolean;
}

export type ArtifactContent = SummaryContent | ContentMapContent | FlashcardContent | QuestionContent;

export interface ReviewQueueItemDto {
  id: number;
  userId: number;
  artifactId: number;
  documentId: number;
  nextReviewAt: Date | string;
  easeFactor: number;
  interval: number;
  streak: number;
  createdAt: Date | string;
  artifactType: ArtifactType;
  artifactMode: ArtifactMode;
  artifactContent: unknown;
  artifactCreatedAt: Date | string;
  front: string | null;
  back: string | null;
}
