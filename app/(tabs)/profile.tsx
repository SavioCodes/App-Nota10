import { Text, View, Pressable, ScrollView, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { startOAuthLogin } from "@/constants/oauth";
import { StyleSheet } from "react-native";

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const { data: usage } = trpc.usage.today.useQuery(undefined, { enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center gap-6">
          <View className="w-20 h-20 rounded-full bg-surface items-center justify-center border-2 border-border">
            <IconSymbol name="person.fill" size={40} color={colors.muted} />
          </View>
          <Text className="text-xl font-semibold text-foreground">Faça login</Text>
          <Text className="text-base text-muted text-center px-8">
            Entre com sua conta para sincronizar seus materiais e acessar todos os recursos.
          </Text>
          <Pressable
            onPress={() => startOAuthLogin()}
            style={({ pressed }) => [styles.loginButton, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text className="text-background font-semibold text-base">Entrar</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const planLabel = usage?.plan === "pro" ? "Pro" : usage?.plan === "pro_enem" ? "Pro+ ENEM" : "Gratuito";

  return (
    <ScreenContainer className="px-5 pt-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground mb-6">Perfil</Text>

        {/* User Info */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
            <Text className="text-2xl font-bold text-background">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-semibold text-foreground">{user?.name || "Usuário"}</Text>
            <Text className="text-sm text-muted">{user?.email || ""}</Text>
            <View className="flex-row items-center mt-1 gap-1">
              <View style={[styles.planBadge, { backgroundColor: usage?.plan === "free" ? colors.muted + "30" : colors.primary + "20" }]}>
                <Text style={{ color: usage?.plan === "free" ? colors.muted : colors.primary }} className="text-xs font-semibold">
                  {planLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upgrade Banner */}
        {usage?.plan === "free" && (
          <Pressable
            onPress={() => router.push("/paywall" as any)}
            style={({ pressed }) => [styles.upgradeBanner, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
          >
            <IconSymbol name="crown.fill" size={24} color={colors.background} />
            <View className="ml-3 flex-1">
              <Text className="text-background font-bold text-base">Upgrade para Pro</Text>
              <Text style={{ color: colors.background + "CC" }} className="text-sm">Conversões ilimitadas, exportação PDF e mais</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.background} />
          </Pressable>
        )}

        {/* Settings */}
        <Text className="text-lg font-semibold text-foreground mt-6 mb-3">Configurações</Text>

        <SettingsItem
          icon="doc.fill"
          title="Exportar PDF"
          subtitle="Exporte seus materiais"
          colors={colors}
          onPress={() => Alert.alert("Exportar PDF", "Selecione um documento na biblioteca para exportar.")}
        />
        <SettingsItem
          icon="lock.fill"
          title="Privacidade"
          subtitle="Política de privacidade"
          colors={colors}
          onPress={() => {}}
        />
        <SettingsItem
          icon="trash.fill"
          title="Apagar Conta"
          subtitle="Remover todos os dados"
          colors={colors}
          danger
          onPress={() => {
            Alert.alert("Apagar Conta", "Tem certeza? Esta ação não pode ser desfeita.", [
              { text: "Cancelar", style: "cancel" },
              { text: "Apagar", style: "destructive", onPress: () => {} },
            ]);
          }}
        />

        {/* Logout */}
        <Pressable
          onPress={() => {
            Alert.alert("Sair", "Deseja sair da sua conta?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Sair", style: "destructive", onPress: logout },
            ]);
          }}
          style={({ pressed }) => [styles.logoutButton, { borderColor: colors.error, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={{ color: colors.error }} className="font-semibold text-base">Sair da Conta</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingsItem({ icon, title, subtitle, colors, danger, onPress }: {
  icon: any; title: string; subtitle: string; colors: any; danger?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingsItem, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
    >
      <IconSymbol name={icon} size={22} color={danger ? colors.error : colors.primary} />
      <View className="flex-1 ml-3">
        <Text style={{ color: danger ? colors.error : colors.foreground }} className="text-base font-medium">{title}</Text>
        <Text className="text-sm text-muted">{subtitle}</Text>
      </View>
      <IconSymbol name="chevron.right" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 50,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  upgradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  logoutButton: {
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 16,
  },
});
