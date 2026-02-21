const DEFAULT_MAX_UPLOAD_MB = 15;
const BYTES_IN_MB = 1024 * 1024;

export function getMaxUploadMb(): number {
  const rawValue = process.env.EXPO_PUBLIC_MAX_UPLOAD_MB ?? String(DEFAULT_MAX_UPLOAD_MB);
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_MB;
  }
  return Math.floor(parsed);
}

export function getMaxUploadBytes(): number {
  return getMaxUploadMb() * BYTES_IN_MB;
}

export function isFileWithinUploadLimit(sizeBytes: number | null | undefined): boolean {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return true;
  }
  return sizeBytes <= getMaxUploadBytes();
}

export function getMaxUploadLabel(): string {
  return `${getMaxUploadMb()} MB`;
}

export function inferMimeTypeFromFileName(
  fileName: string,
  fallback: string = "application/octet-stream",
): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return fallback;

  const mimeByExtension: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };

  return mimeByExtension[extension] ?? fallback;
}
