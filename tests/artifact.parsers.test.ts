import { describe, expect, it } from "vitest";
import {
  toContentMap,
  toFlashcardContent,
  toQuestionContent,
  toSourceIds,
  toSummaryContent,
} from "../features/artifacts/parsers";

describe("artifact parsers", () => {
  it("normalizes source ids to positive integers", () => {
    expect(toSourceIds([1, "2", -1, "x", 3.4])).toEqual([1, 2]);
  });

  it("parses summary content with defaults", () => {
    const parsed = toSummaryContent({ text: "Resumo", section: "FIEL" });
    expect(parsed).toEqual({
      text: "Resumo",
      section: "FIEL",
      isComplement: false,
      notFoundInMaterial: false,
    });
  });

  it("parses content map topics and source ids", () => {
    const parsed = toContentMap({
      title: "Mapa",
      topics: [{ title: "Topico", subtopics: ["A"], sourceChunkIds: [1, "2"] }],
    });
    expect(parsed?.topics[0]?.sourceChunkIds).toEqual([1, 2]);
  });

  it("parses flashcard content", () => {
    const parsed = toFlashcardContent({ front: "F", back: "B" });
    expect(parsed?.front).toBe("F");
    expect(parsed?.back).toBe("B");
  });

  it("maps legacy question fields to current contract", () => {
    const parsed = toQuestionContent({
      prompt: "Pergunta?",
      options: ["A", "B"],
      answerKey: "A",
      rationaleShort: "Porque",
    });
    expect(parsed?.question).toBe("Pergunta?");
    expect(parsed?.correctAnswer).toBe("A");
    expect(parsed?.justification).toBe("Porque");
  });
});
