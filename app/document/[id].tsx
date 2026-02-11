import { Text, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { StyleSheet } from "react-native";

export default function DocumentDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const docId = parseInt(id || "0", 10);

  const { data: doc, isLoading } = trpc.documents.get.useQuery({ id: docId });

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!doc) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-lg text-muted">Documento não encontrado</Text>
      </ScreenContainer>
    );
  }

  const confidenceLabel = doc.ocrConfidence === "high" ? "Alta" : doc.ocrConfidence === "medium" ? "Média" : "Baixa";
  const confidenceColor = doc.ocrConfidence === "high" ? colors.success : doc.ocrConfidence === "medium" ? colors.warning : colors.error;

  return (
    <ScreenContainer className="px-5 pt-4">
      {/* Header */}
      <View className="flex-row items-center mb-4 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground" numberOfLines={1}>{doc.title}</Text>
          <Text className="text-sm text-muted">
            {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Status & Quality */}
        <View className="flex-row gap-3 mb-4">
          <View style={[styles.badge, { backgroundColor: doc.status === "ready" ? colors.success + "20" : colors.warning + "20" }]}>
            <Text style={{ color: doc.status === "ready" ? colors.success : colors.warning }} className="text-sm font-semibold">
              {doc.status === "ready" ? "Pronto" : doc.status === "extracting" ? "Extraindo..." : doc.status === "generating" ? "Gerando..." : doc.status === "error" ? "Erro" : "Enviando..."}
            </Text>
          </View>
          {doc.ocrConfidence && (
            <View style={[styles.badge, { backgroundColor: confidenceColor + "20" }]}>
              <Text style={{ color: confidenceColor }} className="text-sm font-semibold">
                Qualidade: {confidenceLabel}
              </Text>
            </View>
          )}
        </View>

        {/* OCR Warning */}
        {doc.ocrConfidence === "low" && (
          <View style={[styles.warningBox, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
            <IconSymbol name="lightbulb.fill" size={18} color={colors.warning} />
            <Text className="text-sm text-foreground ml-2 flex-1">
              A qualidade da extração está baixa. Tente tirar outra foto com boa iluminação e enquadramento.
            </Text>
          </View>
        )}

        {/* Extracted Text Preview */}
        {doc.extractedText && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-foreground mb-2">Texto Extraído</Text>
            <View style={[styles.textPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-sm text-foreground leading-5" numberOfLines={15}>
                {doc.extractedText}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {doc.status === "ready" && (
          <View className="gap-3">
            <Pressable
              onPress={() => router.push(`/results/${doc.id}` as any)}
              style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <IconSymbol name="lightbulb.fill" size={22} color={colors.background} />
              <Text className="text-background font-bold text-base ml-2">Ver Resultados</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/results/${doc.id}?tab=flashcards` as any)}
              style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.success, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <IconSymbol name="bolt.fill" size={22} color={colors.background} />
              <Text className="text-background font-bold text-base ml-2">Estudar Flashcards</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/results/${doc.id}?tab=questions` as any)}
              style={({ pressed }) => [styles.actionButton, { backgroundColor: "#FF6B6B", opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <IconSymbol name="questionmark.circle.fill" size={22} color={colors.background} />
              <Text className="text-background font-bold text-base ml-2">Fazer Questões</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/export-pdf?documentId=${doc.id}` as any)}
              style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <IconSymbol name="doc.fill" size={22} color={colors.foreground} />
              <Text className="text-foreground font-bold text-base ml-2">Exportar PDF</Text>
            </Pressable>
          </View>
        )}

        {doc.status === "error" && (
          <View style={[styles.warningBox, { backgroundColor: colors.error + "15", borderColor: colors.error + "40" }]}>
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.error} />
            <Text className="text-sm text-foreground ml-2 flex-1">
              Ocorreu um erro ao processar este documento. Tente enviar novamente.
            </Text>
          </View>
        )}

        {(doc.status === "extracting" || doc.status === "generating") && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="text-base text-muted mt-4">
              {doc.status === "extracting" ? "Extraindo texto do documento..." : "Gerando conteúdo de estudo..."}
            </Text>
            <Text className="text-sm text-muted mt-1">Isso pode levar até 2 minutos</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  textPreview: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
  },
});
