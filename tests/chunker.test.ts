import { describe, expect, it } from "vitest";

import { chunkTextDeterministic, computeTextHash } from "../server/_core/chunker";

const SAMPLE_TEXT = `
A Revolucao Francesa marcou uma ruptura politica profunda na Europa.
Ela alterou estruturas de poder, linguagem civica e modelos de participacao popular.

As causas incluem crise fiscal, desigualdade juridica entre estamentos e pressao social por representacao.
Tambem houve influencia do Iluminismo, com enfase em direitos, liberdade civil e soberania popular.

Durante o periodo, ocorreram fases distintas: Assembleia Nacional, Convencao e Diretorio.
Cada fase trouxe mudancas institucionais e conflitos internos relevantes.

No plano internacional, a Revolucao acelerou guerras e reorganizou aliancas.
Seus efeitos chegaram a colonias e inspiraram debates sobre cidadania e escravidao.
`.repeat(6);

describe("chunkTextDeterministic", () => {
  it("is deterministic for the same input", () => {
    const first = chunkTextDeterministic(SAMPLE_TEXT);
    const second = chunkTextDeterministic(SAMPLE_TEXT);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(1);
  });

  it("produces monotonic offsets and non-empty chunk text", () => {
    const chunks = chunkTextDeterministic(SAMPLE_TEXT);

    for (let i = 0; i < chunks.length; i += 1) {
      const current = chunks[i];
      expect(current.textContent.length).toBeGreaterThan(0);
      expect(current.startOffset).toBeGreaterThanOrEqual(0);
      expect(current.endOffset).toBeGreaterThan(current.startOffset);
      if (i > 0) {
        expect(current.startOffset).toBeGreaterThan(chunks[i - 1]!.startOffset);
      }
    }
  });
});

describe("computeTextHash", () => {
  it("returns stable sha256 hash for normalized text", () => {
    const hashA = computeTextHash("abc\r\n123");
    const hashB = computeTextHash("abc\n123");
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });
});
