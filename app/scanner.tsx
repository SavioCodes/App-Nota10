import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";

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
import { getMaxUploadLabel, isFileWithinUploadLimit } from "@/lib/_core/upload-constraints";

function openPermissionSettingsAlert(message: string) {
  Alert.alert("Permissao necessaria", message, [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Abrir configuracoes",
      onPress: () => {
        Linking.openSettings().catch(() => {
          // no-op
        });
      },
    },
  ]);
}

async function ensureCameraPermission() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.granted) return true;

  if (!permission.canAskAgain) {
    openPermissionSettingsAlert("Permita o acesso a camera nas configuracoes do sistema.");
    return false;
  }

  Alert.alert("Permissao negada", "Sem acesso a camera nao e possivel capturar fotos.");
  return false;
}

async function ensureLibraryPermission() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted) return true;

  if (!permission.canAskAgain) {
    openPermissionSettingsAlert("Permita o acesso a galeria nas configuracoes do sistema.");
    return false;
  }

  Alert.alert("Permissao negada", "Sem acesso a galeria nao e possivel selecionar imagens.");
  return false;
}

export default function ScannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isFolderPickerVisible, setIsFolderPickerVisible] = useState(false);

  const { data: folders } = trpc.folders.list.useQuery();
  const uploadMutation = trpc.documents.upload.useMutation();
  const { selectedFolderId, selectedFolder, targetFolderId, selectFolder, persistFolderPreference } = useTargetFolder(
    folders,
  );

  const chooseFolder = () => {
    if (!folders || folders.length === 0) {
      Alert.alert("Sem pastas", "Crie uma pasta na Biblioteca antes de enviar documentos.");
      return;
    }
    setIsFolderPickerVisible(true);
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const hasPermission = await ensureCameraPermission();
        if (!hasPermission) return;
      } else {
        const hasPermission = await ensureLibraryPermission();
        if (!hasPermission) return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            base64: true,
          });

      if (!result || result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (!isFileWithinUploadLimit(asset.fileSize)) {
        Alert.alert("Arquivo muito grande", `O limite atual e ${getMaxUploadLabel()}.`);
        return;
      }

      const base64 =
        asset.base64 ||
        (asset.uri
          ? await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            })
          : "");
      if (!base64) {
        Alert.alert("Erro", "Nao foi possivel ler a imagem selecionada.");
        return;
      }

      await handleUpload(base64, asset.fileName || "photo.jpg", asset.mimeType || "image/jpeg");
    } catch {
      Alert.alert("Erro", "Nao foi possivel capturar a imagem.");
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
          <Text className="text-lg font-semibold text-foreground">Enviando...</Text>
          <Text className="text-sm text-muted">Aguarde enquanto processamos sua imagem</Text>
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
        <Text className="text-xl font-bold text-foreground">Escanear Material</Text>
      </View>

      <Pressable
        onPress={chooseFolder}
        style={({ pressed }) => [
          styles.folderSelector,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
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
        <IconSymbol name="chevron.down" size={14} color={colors.muted} />
      </Pressable>

      <View className="flex-1 items-center justify-center gap-6">
        <Pressable
          onPress={() => pickImage(true)}
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <View style={[styles.optionIcon, { backgroundColor: `${colors.primary}20` }]}>
            <IconSymbol name="camera.fill" size={36} color={colors.primary} />
          </View>
          <Text className="text-lg font-semibold text-foreground mt-3">Tirar Foto</Text>
          <Text className="text-sm text-muted mt-1 text-center">
            Aponte a camera para o material de estudo
          </Text>
        </Pressable>

        <Pressable
          onPress={() => pickImage(false)}
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <View style={[styles.optionIcon, { backgroundColor: `${colors.success}20` }]}>
            <IconSymbol name="photo.fill" size={36} color={colors.success} />
          </View>
          <Text className="text-lg font-semibold text-foreground mt-3">Galeria</Text>
          <Text className="text-sm text-muted mt-1 text-center">Selecione uma imagem da sua galeria</Text>
        </Pressable>

        <View style={[styles.tipBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <IconSymbol name="lightbulb.fill" size={18} color={colors.primary} />
          <Text className="text-sm text-foreground ml-2 flex-1">
            Para melhores resultados, use boa iluminacao e enquadre todo o texto na foto.
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
  optionCard: {
    width: "100%",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  optionIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
