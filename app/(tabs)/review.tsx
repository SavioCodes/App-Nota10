import { ActivityIndicator, FlatList, Pressable, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function ReviewScreen() {
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const router = useRouter();

  const { data: todayItems, isLoading } = trpc.review.today.useQuery(undefined, { enabled: isAuthenticated });
  const { data: allItems } = trpc.review.all.useQuery(undefined, { enabled: isAuthenticated });

  const totalCards = allItems?.length || 0;
  const dueCards = todayItems?.length || 0;
  const estimatedMinutes = dueCards * 2;

  // Calculate streak (simplified - count consecutive days with reviews)
  const streak = allItems?.reduce((max, item) => Math.max(max, item.streak), 0) || 0;

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-muted">Faça login para acessar suas revisões</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pt-4">
      <Text className="text-2xl font-bold text-foreground mb-4">Revisão</Text>

      {/* Stats Row */}
      <View className="flex-row gap-3 mb-6">
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="flame.fill" size={24} color={colors.error} />
          <Text className="text-2xl font-bold text-foreground mt-1">{streak}</Text>
          <Text className="text-xs text-muted">Streak</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="clock.fill" size={24} color={colors.primary} />
          <Text className="text-2xl font-bold text-foreground mt-1">{dueCards}</Text>
          <Text className="text-xs text-muted">Pendentes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
          <Text className="text-2xl font-bold text-foreground mt-1">{totalCards}</Text>
          <Text className="text-xs text-muted">Total</Text>
        </View>
      </View>

      {/* Start Review Button */}
      {dueCards > 0 && (
        <Pressable
          onPress={() => router.push("/review-session")}
          style={({ pressed }) => [styles.startButton, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <View className="flex-row items-center gap-2">
            <IconSymbol name="bolt.fill" size={22} color={colors.background} />
            <Text className="text-background font-bold text-lg">Começar Revisão</Text>
          </View>
          <Text style={{ color: colors.background + "CC" }} className="text-sm mt-1">
            {dueCards} cards · ~{estimatedMinutes} min
          </Text>
        </Pressable>
      )}

      {/* Empty State */}
      {dueCards === 0 && !isLoading && (
        <View className="items-center py-12">
          <IconSymbol name="checkmark.circle.fill" size={56} color={colors.success} />
          <Text className="text-xl font-semibold text-foreground mt-4">Tudo em dia!</Text>
          <Text className="text-base text-muted mt-2 text-center px-8">
            Nenhum card para revisar agora. Processe novos materiais para criar flashcards.
          </Text>
        </View>
      )}

      {isLoading && (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Review Queue Preview */}
      {todayItems && todayItems.length > 0 && (
        <View className="mt-6">
          <Text className="text-lg font-semibold text-foreground mb-3">Fila de Hoje</Text>
          <FlatList
            data={todayItems.slice(0, 10)}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={[styles.queueItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.queueNumber, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={{ color: colors.primary }} className="font-bold text-sm">{index + 1}</Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-sm text-foreground" numberOfLines={1}>
                    {item.front || `Flashcard #${item.artifactId}`}
                  </Text>
                  <Text className="text-xs text-muted">Intervalo: {item.interval} dia(s)</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  startButton: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  queueNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
