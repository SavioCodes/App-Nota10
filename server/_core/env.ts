function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  directDatabaseUrl: process.env.DIRECT_DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Feature flags
  authSupabaseEnabled: parseBoolean(process.env.AUTH_SUPABASE_ENABLED, false),
  dbDualWriteEnabled: parseBoolean(process.env.DB_DUAL_WRITE, false),
  dbReadPostgresEnabled: parseBoolean(process.env.DB_READ_POSTGRES, true),
  billingMercadoPagoWebEnabled: parseBoolean(process.env.BILLING_MERCADOPAGO_WEB_ENABLED, false),
  billingNativeIapEnabled: parseBoolean(process.env.BILLING_NATIVE_IAP_ENABLED, false),

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "",

  // Legacy Forge storage (kept as fallback during migration)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Billing providers
  mercadoPagoAccessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  mercadoPagoPublicKey: process.env.MERCADOPAGO_PUBLIC_KEY ?? "",
  mercadoPagoWebhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
  mercadoPagoWebhookUrl: process.env.MERCADOPAGO_WEBHOOK_URL ?? "",
  mercadoPagoStatementDescriptor: process.env.MERCADOPAGO_STATEMENT_DESCRIPTOR ?? "",

  // Apple/Google server-side billing verification
  appleIssuerId: process.env.APPLE_ISSUER_ID ?? "",
  appleKeyId: process.env.APPLE_KEY_ID ?? "",
  applePrivateKeyBase64: process.env.APPLE_PRIVATE_KEY_BASE64 ?? "",
  appleBundleId: process.env.APPLE_BUNDLE_ID ?? process.env.APP_BUNDLE_ID ?? "",
  googlePlayPackageName: process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "",
  googlePlayServiceAccountJsonBase64: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 ?? "",

  rateLimitUploadMax: parseNumber(process.env.RATE_LIMIT_UPLOAD_MAX, 8),
  rateLimitUploadWindowMs: parseNumber(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS, 60000),
  rateLimitArtifactsMax: parseNumber(process.env.RATE_LIMIT_ARTIFACTS_MAX, 20),
  rateLimitArtifactsWindowMs: parseNumber(process.env.RATE_LIMIT_ARTIFACTS_WINDOW_MS, 60000),
  geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? "",
  geminiFastModel: process.env.GEMINI_FAST_MODEL ?? "gemini-3-flash-preview",
  geminiStrictModel: process.env.GEMINI_STRICT_MODEL ?? "gemini-3-pro-preview",
  geminiThinkingLevelFast: process.env.GEMINI_THINKING_LEVEL_FAST ?? "medium",
  geminiThinkingLevelStrict: process.env.GEMINI_THINKING_LEVEL_STRICT ?? "high",
  maxUploadMb: parseNumber(process.env.MAX_UPLOAD_MB, 15),
  maxPdfPagesOcr: parseNumber(process.env.MAX_PDF_PAGES_OCR, 30),
};
