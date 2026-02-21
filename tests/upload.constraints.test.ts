import { describe, expect, it, vi } from "vitest";
import {
  getMaxUploadBytes,
  getMaxUploadLabel,
  getMaxUploadMb,
  inferMimeTypeFromFileName,
  isFileWithinUploadLimit,
} from "../lib/_core/upload-constraints";

describe("upload constraints", () => {
  it("uses EXPO_PUBLIC_MAX_UPLOAD_MB when valid", () => {
    vi.stubEnv("EXPO_PUBLIC_MAX_UPLOAD_MB", "20");
    expect(getMaxUploadMb()).toBe(20);
    expect(getMaxUploadLabel()).toBe("20 MB");
    expect(getMaxUploadBytes()).toBe(20 * 1024 * 1024);
    vi.unstubAllEnvs();
  });

  it("falls back to default when env is invalid", () => {
    vi.stubEnv("EXPO_PUBLIC_MAX_UPLOAD_MB", "invalid");
    expect(getMaxUploadMb()).toBe(15);
    vi.unstubAllEnvs();
  });

  it("validates file size against the resolved limit", () => {
    vi.stubEnv("EXPO_PUBLIC_MAX_UPLOAD_MB", "1");
    expect(isFileWithinUploadLimit(512 * 1024)).toBe(true);
    expect(isFileWithinUploadLimit(2 * 1024 * 1024)).toBe(false);
    expect(isFileWithinUploadLimit(undefined)).toBe(true);
    vi.unstubAllEnvs();
  });

  it("infers mime type from known file extensions", () => {
    expect(inferMimeTypeFromFileName("arquivo.pdf")).toBe("application/pdf");
    expect(inferMimeTypeFromFileName("foto.HEIC")).toBe("image/heic");
    expect(inferMimeTypeFromFileName("foto.jpg")).toBe("image/jpeg");
  });

  it("returns fallback mime type for unknown extensions", () => {
    expect(inferMimeTypeFromFileName("arquivo.xyz", "application/pdf")).toBe("application/pdf");
  });
});
