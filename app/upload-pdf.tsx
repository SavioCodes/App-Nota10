import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";

import { FolderPickerModal } from "@/components/folder-picker-modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useTargetFolder } from "@/hooks/use-target-folder";
import { trpc } from "@/lib/trpc";
import {
  formatRateLimitHint,
  formatUnsupportedMimeHint,
  formatUploadLimitHint,
  parseAppError,
} from "@/lib/_core/app-errors";
import {
  getMaxUploadLabel,
  inferMimeTypeFromFileName,
  isFileWithinUploadLimit,
} from "@/lib/_core/upload-constraints";

export default function UploadPdfScreen() {
  const colors = useColors();
  const router = useRouter();
  const { folderId: folderIdParam } = useLocalSearchParams<{ folderId?: string }>();
  const folderIdFromParam = folderIdParam ? Number.parseInt(folderIdParam, 10) : NaN;
  const forcedFolderId = Number.isInteger(folderIdFromParam) && folderIdFromParam > 0 ? folderIdFromParam : null;

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isFolderPickerVisible, setIsFolderPickerVisible] = useState(false);

  const { data: folders } = trpc.folders.list.useQuery();
  const isFolderLocked = Boolean(forcedFolderId && folders?.some((folder) => folder.id === forcedFolderId));
  const uploadMutation = trpc.documents.upload.useMutation();
  const { selectedFolderId, selectedFolder, targetFolderId, selectFolder, persistFolderPreference } = useTargetFolder(
    folders,
    { forcedFolderId },
  );

  const chooseFolder = () => {
    if (isFolderLocked) return;
    if (!folders || folders.length === 0) {
      Alert.alert("Sem pastas", "Crie uma pasta na Biblioteca antes de enviar documentos.");
      return;
    }
    setIsFolderPickerVisible(true);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      const fileSizeFromInfo =
        "size" in fileInfo && typeof fileInfo.size === "number" ? fileInfo.size : undefined;
      const fileSize = typeof asset.size === "number" ? asset.size : fileSizeFromInfo;
      if (!isFileWithinUploadLimit(fileSize)) {
        Alert.alert("Arquivo muito grande", `O limite atual e ${getMaxUploadLabel()}.`);
        return;
      }

      setSelectedFile(asset.name);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const inferredMimeType = inferMimeTypeFromFileName(asset.name, "application/pdf");
      await handleUpload(base64, asset.name, asset.mimeType || inferredMimeType);
    } catch {
      Alert.alert("Erro", "Nao foi possivel selecionar o arquivo.");
    }
  };

  const handleUpload = async (base64: string, fileName: string, mimeType: string) => {
    if (!targetFolderId) {
      Alert.alert("Crie uma pasta", "Va para a Biblioteca e crie uma pasta antes de enviar documentos.");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadMutation.mutateAsync({
        folderId: targetFolderId,
        title: fileName.replace(/\.[^/.]+$/, ""),
        fileBase64: base64,
        fileName,
        mimeType,
      });
      await persistFolderPreference(targetFolderId);
      router.replace(`/document/${result.id}`);
    } catch (error: unknown) {
      const parsedError = parseAppError(error);
      if (parsedError.kind === "limit_reached") {
        Alert.alert("Limite atingido", "Voce atingiu o limite diario de conversoes.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Ver Planos", onPress: () => router.push("/paywall") },
        ]);
      } else if (parsedError.kind === "rate_limited") {
        Alert.alert("Muitas tentativas", formatRateLimitHint(parsedError.retryAfterSeconds));
      } else if (parsedError.kind === "file_too_large") {
        Alert.alert("Arquivo muito grande", formatUploadLimitHint(parsedError.maxMb));
      } else if (parsedError.kind === "unsupported_mime") {
        Alert.alert("Formato nao suportado", formatUnsupportedMimeHint(parsedError.mimeType));
      } else {
        Alert.alert("Erro", "Nao foi possivel enviar o documento.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (isUploading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center gap-4">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-lg font-semibold text-foreground">Enviando {selectedFile || "arquivo"}...</Text>
          <Text className="text-sm text-muted">Aguarde enquanto processamos seu documento</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pt-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-row items-center mb-6 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Enviar Documento</Text>
      </View>

      <Pressable
        onPress={chooseFolder}
        disabled={isFolderLocked}
        style={({ pressed }) => [
          styles.folderSelector,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: isFolderLocked ? 0.65 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <IconSymbol name="folder.fill" size={20} color={colors.primary} />
        <View className="flex-1 ml-2">
          <Text className="text-xs text-muted">Pasta de destino</Text>
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {selectedFolder?.name ?? "Selecione uma pasta"}
          </Text>
        </View>
        <IconSymbol name={isFolderLocked ? "lock.fill" : "chevron.down"} size={14} color={colors.muted} />
      </Pressable>

      <View className="flex-1 items-center justify-center gap-6">
        <Pressable
          onPress={pickDocument}
          style={({ pressed }) => [
            styles.uploadArea,
            {
              borderColor: `${colors.primary}60`,
              backgroundColor: `${colors.primary}08`,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[styles.uploadIcon, { backgroundColor: `${colors.primary}20` }]}>
            <IconSymbol name="doc.fill" size={40} color={colors.primary} />
          </View>
          <Text className="text-lg font-semibold text-foreground mt-4">Toque para selecionar</Text>
          <Text className="text-sm text-muted mt-1">PDF ou imagem (JPG, PNG)</Text>
        </Pressable>

        <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text className="text-sm font-semibold text-foreground mb-2">Formatos suportados:</Text>
          <View className="flex-row flex-wrap gap-2">
            {["PDF", "JPG", "PNG", "HEIC"].map((format) => (
              <View key={format} style={[styles.formatBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={{ color: colors.primary }} className="text-xs font-semibold">
                  {format}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.tipBox, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
          <IconSymbol name="lightbulb.fill" size={18} color={colors.warning} />
          <Text className="text-sm text-foreground ml-2 flex-1">
            PDFs com texto selecionavel costumam gerar resultados melhores.
          </Text>
        </View>
      </View>

      <FolderPickerModal
        visible={isFolderPickerVisible}
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelect={selectFolder}
        onClose={() => setIsFolderPickerVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  uploadArea: {
    width: "100%",
    padding: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  formatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  folderSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
});
