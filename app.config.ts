// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

function hasPurchasesConfigPlugin(): boolean {
  try {
    if (typeof require !== "function" || typeof require.resolve !== "function") {
      return false;
    }
    require.resolve("react-native-purchases/app.plugin.js");
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_BUNDLE_ID = "com.saviocodes.nota10";
const DEFAULT_APP_SCHEME = "nota10";

// Bundle ID can be configured by APP_BUNDLE_ID.
const rawBundleId = process.env.APP_BUNDLE_ID ?? DEFAULT_BUNDLE_ID;
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
const env = {
  appName: "Nota10",
  appSlug: "nota10",
  scheme: process.env.APP_SCHEME ?? DEFAULT_APP_SCHEME,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const purchasesPluginEnabled = hasPurchasesConfigPlugin();

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: "Permita acesso a camera para capturar materiais de estudo.",
      NSPhotoLibraryUsageDescription: "Permita acesso a galeria para selecionar materiais de estudo.",
      NSPhotoLibraryAddUsageDescription: "Permita salvar arquivos exportados na sua galeria.",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#6C5CE7",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS", "CAMERA", "READ_MEDIA_IMAGES"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  extra: {
    deepLinkScheme: env.scheme,
    eas: {
      projectId: "6b4735c1-b62f-4234-9cd5-7de5567cfebf",
    },
  },
  plugins: [
    "expo-router",
    ...(purchasesPluginEnabled ? ["react-native-purchases"] : []),
    [
      "expo-image-picker",
      {
        photosPermission: "Permita acesso a galeria para selecionar materiais de estudo.",
        cameraPermission: "Permita acesso a camera para capturar materiais de estudo.",
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
