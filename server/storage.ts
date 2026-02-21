import { ENV } from "./_core/env";

type StorageConfig =
  | {
      provider: "supabase";
      supabaseUrl: string;
      serviceRoleKey: string;
      bucket: string;
    }
  | {
      provider: "forge";
      baseUrl: string;
      apiKey: string;
    };

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string,
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : (() => {
          const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
          const copy = new Uint8Array(bytes);
          return new Blob([copy.buffer], { type: contentType });
        })();
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function getStorageConfig(): StorageConfig {
  if (ENV.supabaseUrl && ENV.supabaseServiceRoleKey && ENV.supabaseStorageBucket) {
    return {
      provider: "supabase",
      supabaseUrl: ENV.supabaseUrl.replace(/\/+$/, ""),
      serviceRoleKey: ENV.supabaseServiceRoleKey,
      bucket: ENV.supabaseStorageBucket,
    };
  }

  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    return {
      provider: "forge",
      baseUrl: ENV.forgeApiUrl.replace(/\/+$/, ""),
      apiKey: ENV.forgeApiKey,
    };
  }

  throw new Error(
    "Storage credentials missing: configure Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET) or legacy Forge vars",
  );
}

function buildForgeUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildForgeDownloadUrl(baseUrl: string, relKey: string, apiKey: string): Promise<string> {
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage download URL failed (${response.status} ${response.statusText}): ${message}`);
  }

  return (await response.json()).url;
}

function buildSupabaseObjectUrl(config: Extract<StorageConfig, { provider: "supabase" }>, key: string): string {
  return `${config.supabaseUrl}/storage/v1/object/public/${config.bucket}/${encodeURI(key)}`;
}

function supabaseHeaders(config: Extract<StorageConfig, { provider: "supabase" }>, contentType?: string): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);

  if (config.provider === "supabase") {
    const endpoint = `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${key}`;
    const body =
      typeof data === "string"
        ? data
        : (() => {
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            return Buffer.from(bytes);
          })();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...supabaseHeaders(config, contentType),
        "x-upsert": "true",
      },
      body,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Supabase storage upload failed (${response.status} ${response.statusText}): ${message}`);
    }

    return {
      key,
      url: buildSupabaseObjectUrl(config, key),
    };
  }

  const uploadUrl = buildForgeUploadUrl(config.baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status} ${response.statusText}): ${message}`);
  }

  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);

  if (config.provider === "supabase") {
    return {
      key,
      url: buildSupabaseObjectUrl(config, key),
    };
  }

  return {
    key,
    url: await buildForgeDownloadUrl(config.baseUrl, key, config.apiKey),
  };
}

export async function storageDelete(relKey: string): Promise<void> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);

  if (config.provider === "supabase") {
    const endpoint = `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${encodeURI(key)}`;
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: supabaseHeaders(config),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(`Supabase storage delete failed (${response.status} ${response.statusText}): ${message}`);
    }
    return;
  }

  // Legacy Forge API currently has no delete endpoint in this project integration.
}
