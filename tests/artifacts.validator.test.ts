import { describe, expect, it } from "vitest";

import {
  createEmptyArtifactBundle,
  validateArtifactBundleSources,
  type ArtifactBundle,
} from "../server/_core/artifacts";

function baseBundle(): ArtifactBundle {
  const bundle = createEmptyArtifactBundle();
  bundle.summary = [
    {
      text: "Resumo sem fonte",
      sourceChunkIds: [],
    },
  ];
  bundle.flashcards = [
    {
      front: "Pergunta",
      back: "Resposta",
      difficultyTag: "definition",
      sourceChunkIds: [],
    },
  ];
  bundle.questions = [
    {
      type: "multiple_choice",
      prompt: "Qual alternativa correta?",
      options: ["A", "B", "C", "D"],
      answerKey: "A",
      rationaleShort: "Justificativa",
      sourceChunkIds: [],
    },
  ];
  return bundle;
}

describe("validateArtifactBundleSources", () => {
  it("marks faithful items without source as not found", () => {
    const validated = validateArtifactBundleSources(baseBundle(), new Set([1, 2]), "faithful");

    expect(validated.summary[0]?.notFoundInMaterial).toBe(true);
    expect(validated.flashcards[0]?.notFoundInMaterial).toBe(true);
    expect(validated.questions[0]?.notFoundInMaterial).toBe(true);
  });

  it("allows deepened complemento without source", () => {
    const bundle = baseBundle();
    bundle.summary[0]!.section = "COMPLEMENTO";
    bundle.summary[0]!.isComplement = true;

    const validated = validateArtifactBundleSources(bundle, new Set([1, 2]), "deepened");
    expect(validated.summary[0]?.notFoundInMaterial).toBe(false);
  });
});
