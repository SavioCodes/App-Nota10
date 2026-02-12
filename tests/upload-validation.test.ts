import { describe, expect, it } from "vitest";

import { assertUploadMimeType } from "../server/_core/extraction";

describe("assertUploadMimeType", () => {
  it("accepts application/pdf and image/*", () => {
    expect(() => assertUploadMimeType("application/pdf")).not.toThrow();
    expect(() => assertUploadMimeType("image/jpeg")).not.toThrow();
    expect(() => assertUploadMimeType("image/png")).not.toThrow();
  });

  it("rejects unsupported mime types", () => {
    expect(() => assertUploadMimeType("text/plain")).toThrow("UNSUPPORTED_MIME_TYPE_text/plain");
    expect(() => assertUploadMimeType("application/zip")).toThrow("UNSUPPORTED_MIME_TYPE_application/zip");
  });
});
