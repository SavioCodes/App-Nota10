import { Text, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { trpc } from "@/lib/trpc";

export default function UploadPdfScreen() {
  const colors = useColors();
  const router = useRouter();
  const { folderId: folderIdParam } = useLocalSearchParams<{ folderId?: string }>();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: folders } = trpc.folders.list.useQuery();
  const uploadMutation = trpc.documents.upload.useMutation();

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile(asset.name);

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await handleUpload(base64, asset.name, asset.mimeType || "application/pdf");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível selecionar o arquivo.");
    }
  };

  const handleUpload = async (base64: string, fileName: string, mimeType: string) => {
    const targetFolderId = folderIdParam ? parseInt(folderIdParam, 10) : folders?.[0]?.id;

    if (!targetFolderId) {
      Alert.alert("Crie uma pasta", "Vá para a Biblioteca e crie uma pasta antes de enviar documentos.");
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
      router.replace(`/document/${result.id}` as any);
    } catch (error: any) {
      if (error.message?.includes("LIMIT_REACHED")) {
        Alert.alert("Limite atingido", "Você atingiu o limite diário de conversões. Faça upgrade para Pro.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Ver Planos", onPress: () => router.push("/paywall" as any) },
        ]);
      } else {
        Alert.alert("Erro", "Não foi possível enviar o documento.");
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
          <Text className="text-lg font-semibold text-foreground">Enviando {selectedFile}...</Text>
          <Text className="text-sm text-muted">Aguarde enquanto processamos seu documento</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pt-4" edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center mb-6 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Enviar Documento</Text>
      </View>

      <View className="flex-1 items-center justify-center gap-6">
        {/* Upload Area */}
        <Pressable
          onPress={pickDocument}
          style={({ pressed }) => [styles.uploadArea, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "08", opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={[styles.uploadIcon, { backgroundColor: colors.primary + "20" }]}>
            <IconSymbol name="doc.fill" size={40} color={colors.primary} />
          </View>
          <Text className="text-lg font-semibold text-foreground mt-4">Toque para selecionar</Text>
          <Text className="text-sm text-muted mt-1">PDF ou imagem (JPG, PNG)</Text>
        </Pressable>

        {/* Supported Formats */}
        <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text className="text-sm font-semibold text-foreground mb-2">Formatos suportados:</Text>
          <View className="flex-row flex-wrap gap-2">
            {["PDF", "JPG", "PNG", "HEIC"].map(fmt => (
              <View key={fmt} style={[styles.formatBadge, { backgroundColor: colors.primary + "15" }]}>
                <Text style={{ color: colors.primary }} className="text-xs font-semibold">{fmt}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={[styles.tipBox, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "30" }]}>
          <IconSymbol name="lightbulb.fill" size={18} color={colors.warning} />
          <Text className="text-sm text-foreground ml-2 flex-1">
            Para PDFs, certifique-se de que o texto é selecionável. PDFs escaneados também funcionam, mas a qualidade pode variar.
          </Text>
        </View>
      </View>
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
});
