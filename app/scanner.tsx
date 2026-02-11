import { Text, View, Pressable, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { trpc } from "@/lib/trpc";

export default function ScannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: folders } = trpc.folders.list.useQuery();
  const uploadMutation = trpc.documents.upload.useMutation();

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permissão necessária", "Permita o acesso à câmera nas configurações.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setSelectedImage(asset.uri);
          await handleUpload(asset.base64, asset.fileName || "photo.jpg", asset.mimeType || "image/jpeg");
        }
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível capturar a imagem.");
    }
  };

  const handleUpload = async (base64: string, fileName: string, mimeType: string) => {
    if (!folders || folders.length === 0) {
      Alert.alert("Crie uma pasta", "Vá para a Biblioteca e crie uma pasta antes de enviar documentos.");
      return;
    }

    const defaultFolder = folders[0];
    setIsUploading(true);

    try {
      const result = await uploadMutation.mutateAsync({
        folderId: defaultFolder.id,
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
          <Text className="text-lg font-semibold text-foreground">Enviando...</Text>
          <Text className="text-sm text-muted">Aguarde enquanto processamos sua imagem</Text>
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
        <Text className="text-xl font-bold text-foreground">Escanear Material</Text>
      </View>

      <View className="flex-1 items-center justify-center gap-6">
        {/* Camera Option */}
        <Pressable
          onPress={() => pickImage(true)}
          style={({ pressed }) => [styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.primary + "20" }]}>
            <IconSymbol name="camera.fill" size={36} color={colors.primary} />
          </View>
          <Text className="text-lg font-semibold text-foreground mt-3">Tirar Foto</Text>
          <Text className="text-sm text-muted mt-1 text-center">Aponte a câmera para o material de estudo</Text>
        </Pressable>

        {/* Gallery Option */}
        <Pressable
          onPress={() => pickImage(false)}
          style={({ pressed }) => [styles.optionCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.success + "20" }]}>
            <IconSymbol name="photo.fill" size={36} color={colors.success} />
          </View>
          <Text className="text-lg font-semibold text-foreground mt-3">Galeria</Text>
          <Text className="text-sm text-muted mt-1 text-center">Selecione uma imagem da sua galeria</Text>
        </Pressable>

        {/* Tips */}
        <View style={[styles.tipBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <IconSymbol name="lightbulb.fill" size={18} color={colors.primary} />
          <Text className="text-sm text-foreground ml-2 flex-1">
            Para melhores resultados, use boa iluminação e enquadre todo o texto na foto.
          </Text>
        </View>
      </View>
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
});
