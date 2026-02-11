import { ScrollView, Text, View, Pressable, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { StyleSheet } from "react-native";

export default function HomeScreen() {
  const { user, isAuthenticated } = useAuth();
  const colors = useColors();
  const router = useRouter();

  const { data: recentDocs } = trpc.documents.recent.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: usage } = trpc.usage.today.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: reviewItems } = trpc.review.today.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center gap-6">
          <View className="w-20 h-20 rounded-2xl bg-primary items-center justify-center">
            <Text className="text-4xl font-bold text-background">N</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground">Nota10</Text>
          <Text className="text-base text-muted text-center px-8">
            Transforme seus materiais de estudo em resumos, flashcards e questões de prova com IA.
          </Text>
          <Pressable
            onPress={() => router.push("/onboarding" as any)}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <Text className="text-background font-semibold text-lg">Começar</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pt-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-base text-muted">Olá,</Text>
            <Text className="text-2xl font-bold text-foreground">{user?.name || "Estudante"}</Text>
          </View>
          {reviewItems && reviewItems.length > 0 && (
            <View className="bg-primary px-3 py-1.5 rounded-full flex-row items-center gap-1">
              <IconSymbol name="flame.fill" size={16} color={colors.background} />
              <Text className="text-background font-semibold text-sm">{reviewItems.length} para revisar</Text>
            </View>
          )}
        </View>

        {/* Usage indicator for free users */}
        {usage && usage.plan === "free" && (
          <View className="bg-surface rounded-2xl p-4 mb-5 border border-border">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-muted">Conversões hoje</Text>
              <Text className="text-sm font-semibold text-foreground">{usage.conversionsUsed}/{usage.conversionsLimit}</Text>
            </View>
            <View className="h-2 bg-border rounded-full overflow-hidden">
              <View
                style={[styles.progressBar, { width: `${Math.min(100, (usage.conversionsUsed / usage.conversionsLimit) * 100)}%`, backgroundColor: usage.conversionsUsed >= usage.conversionsLimit ? colors.error : colors.primary }]}
              />
            </View>
            {usage.conversionsUsed >= usage.conversionsLimit && (
              <Pressable
                onPress={() => router.push("/paywall" as any)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <Text className="text-primary text-sm font-semibold mt-2">Upgrade para Pro →</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Action Grid */}
        <Text className="text-lg font-semibold text-foreground mb-3">Ações</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          <ActionCard
            icon="camera.fill"
            title="Escanear"
            subtitle="Tire foto do material"
            color={colors.primary}
            onPress={() => router.push("/scanner" as any)}
            colors={colors}
          />
          <ActionCard
            icon="doc.fill"
            title="Enviar PDF"
            subtitle="Importe um arquivo"
            color={colors.success}
            onPress={() => router.push("/upload-pdf" as any)}
            colors={colors}
          />
          <ActionCard
            icon="folder.fill"
            title="Minhas Pastas"
            subtitle="Organize por matéria"
            color={colors.warning}
            onPress={() => router.push("/(tabs)/library" as any)}
            colors={colors}
          />
          <ActionCard
            icon="clock.fill"
            title="Revisão de Hoje"
            subtitle={`${reviewItems?.length || 0} cards pendentes`}
            color="#FF6B6B"
            onPress={() => router.push("/(tabs)/review" as any)}
            colors={colors}
          />
        </View>

        {/* Recent Documents */}
        {recentDocs && recentDocs.length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-foreground mb-3">Recentes</Text>
            {recentDocs.map((doc) => (
              <Pressable
                key={doc.id}
                onPress={() => router.push(`/document/${doc.id}` as any)}
                style={({ pressed }) => [styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <View className="flex-row items-center gap-3">
                  <View style={[styles.docIcon, { backgroundColor: colors.primary + "20" }]}>
                    <IconSymbol name="doc.fill" size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-foreground" numberOfLines={1}>{doc.title}</Text>
                    <Text className="text-sm text-muted">
                      {doc.status === "ready" ? "Pronto" : doc.status === "extracting" ? "Extraindo texto..." : doc.status === "generating" ? "Gerando conteúdo..." : doc.status === "error" ? "Erro" : "Enviando..."}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color={colors.muted} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function ActionCard({ icon, title, subtitle, color, onPress, colors }: {
  icon: any;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + "20" }]}>
        <IconSymbol name={icon} size={24} color={color} />
      </View>
      <Text className="text-sm font-semibold text-foreground mt-2">{title}</Text>
      <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 8,
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
  },
  actionCard: {
    width: "47.5%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recentCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
