import { Text, View, Pressable, FlatList, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { StyleSheet } from "react-native";

export default function FolderDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const folderId = parseInt(id || "0", 10);

  const { data: documents, isLoading } = trpc.documents.list.useQuery({ folderId });
  const { data: folders } = trpc.folders.list.useQuery();
  const folder = folders?.find(f => f.id === folderId);

  const statusLabel = (status: string) => {
    switch (status) {
      case "ready": return { text: "Pronto", color: colors.success };
      case "extracting": return { text: "Extraindo...", color: colors.warning };
      case "generating": return { text: "Gerando...", color: colors.primary };
      case "error": return { text: "Erro", color: colors.error };
      default: return { text: "Enviando...", color: colors.muted };
    }
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      {/* Header */}
      <View className="flex-row items-center mb-4 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground">{folder?.name || "Pasta"}</Text>
          <Text className="text-sm text-muted">{documents?.length || 0} documento(s)</Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const status = statusLabel(item.status);
            return (
              <Pressable
                onPress={() => router.push(`/document/${item.id}` as any)}
                style={({ pressed }) => [styles.docCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={[styles.docIcon, { backgroundColor: colors.primary + "20" }]}>
                  <IconSymbol name="doc.fill" size={22} color={colors.primary} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-base font-medium text-foreground" numberOfLines={1}>{item.title}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text className="text-sm text-muted">{status.text}</Text>
                    {item.ocrConfidence && (
                      <Text className="text-xs text-muted">
                        · OCR: {item.ocrConfidence === "high" ? "Alta" : item.ocrConfidence === "medium" ? "Média" : "Baixa"}
                      </Text>
                    )}
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={18} color={colors.muted} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <IconSymbol name="doc.fill" size={48} color={colors.muted} />
              <Text className="text-base text-muted mt-3">Nenhum documento nesta pasta</Text>
              <Text className="text-sm text-muted mt-1">Escaneie ou envie um PDF para começar</Text>
            </View>
          }
        />
      )}

      {/* FAB - Add Document */}
      <Pressable
        onPress={() => router.push(`/upload-pdf?folderId=${folderId}` as any)}
        style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
      >
        <IconSymbol name="plus" size={28} color={colors.background} />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
