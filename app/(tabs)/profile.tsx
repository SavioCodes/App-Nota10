import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import type { ThemeColorPalette } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { appLogger } from "@/lib/_core/logger";
import { trpc } from "@/lib/trpc";

const PRIVACY_POLICY_FALLBACK_URL =
  "https://github.com/SavioCodes/App-Nota10/blob/main/docs/PRIVACY.md";

function getPrivacyPolicyUrl(): string {
  const configured = (process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "").trim();
  if (configured) return configured;
  return PRIVACY_POLICY_FALLBACK_URL;
}

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: usage } = trpc.usage.today.useQuery(undefined, { enabled: isAuthenticated });
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();

  const openPrivacyPolicy = async () => {
    const url = getPrivacyPolicyUrl();

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Privacidade", "Nao foi possivel abrir o link da politica de privacidade.");
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      appLogger.warn("profile.privacy_open_failed", {
        message: error instanceof Error ? error.message : "unknown_error",
      });
      Alert.alert("Privacidade", "Nao foi possivel abrir a politica de privacidade agora.");
    }
  };

  const executeDeleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync();
      await logout();
      await utils.usage.today.invalidate();
      Alert.alert("Conta apagada", "Sua conta e dados foram removidos com sucesso.");
    } catch (error) {
      appLogger.error("profile.delete_account_failed", {
        message: error instanceof Error ? error.message : "unknown_error",
      });
      Alert.alert("Erro", "Nao foi possivel apagar sua conta agora.");
    }
  };

  const confirmDeleteAccount = () => {
    if (deleteAccountMutation.isPending) return;

    Alert.alert("Apagar conta", "Tem certeza? Esta acao nao pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          void executeDeleteAccount();
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center gap-6">
          <View className="w-20 h-20 rounded-full bg-surface items-center justify-center border-2 border-border">
            <IconSymbol name="person.fill" size={40} color={colors.muted} />
          </View>
          <Text className="text-xl font-semibold text-foreground">Faca login</Text>
          <Text className="text-base text-muted text-center px-8">
            Entre com sua conta para sincronizar seus materiais e acessar todos os recursos.
          </Text>
          <Pressable
            onPress={() => {
              void startOAuthLogin();
            }}
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
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

        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
            <Text className="text-2xl font-bold text-background">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-semibold text-foreground">{user?.name || "Usuario"}</Text>
            <Text className="text-sm text-muted">{user?.email || ""}</Text>
            <View className="flex-row items-center mt-1 gap-1">
              <View
                style={[
                  styles.planBadge,
                  { backgroundColor: usage?.plan === "free" ? colors.muted + "30" : colors.primary + "20" },
                ]}
              >
                <Text
                  style={{ color: usage?.plan === "free" ? colors.muted : colors.primary }}
                  className="text-xs font-semibold"
                >
                  {planLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {usage?.plan === "free" && (
          <Pressable
            onPress={() => router.push("/paywall")}
            style={({ pressed }) => [
              styles.upgradeBanner,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <IconSymbol name="crown.fill" size={24} color={colors.background} />
            <View className="ml-3 flex-1">
              <Text className="text-background font-bold text-base">Upgrade para Pro</Text>
              <Text style={{ color: colors.background + "CC" }} className="text-sm">
                Conversoes ilimitadas, exportacao PDF e mais
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.background} />
          </Pressable>
        )}

        <Text className="text-lg font-semibold text-foreground mt-6 mb-3">Configuracoes</Text>

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
          subtitle="Politica de privacidade"
          colors={colors}
          onPress={() => {
            void openPrivacyPolicy();
          }}
        />

        <SettingsItem
          icon="trash.fill"
          title={deleteAccountMutation.isPending ? "Apagando conta..." : "Apagar conta"}
          subtitle="Remover todos os dados"
          colors={colors}
          danger
          onPress={confirmDeleteAccount}
          disabled={deleteAccountMutation.isPending}
        />

        <Pressable
          onPress={() => {
            Alert.alert("Sair", "Deseja sair da sua conta?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Sair", style: "destructive", onPress: () => void logout() },
            ]);
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            { borderColor: colors.error, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={{ color: colors.error }} className="font-semibold text-base">
            Sair da conta
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingsItem({
  icon,
  title,
  subtitle,
  colors,
  danger,
  onPress,
  disabled,
}: {
  icon: Parameters<typeof IconSymbol>[0]["name"];
  title: string;
  subtitle: string;
  colors: ThemeColorPalette;
  danger?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <IconSymbol name={icon} size={22} color={danger ? colors.error : colors.primary} />
      <View className="flex-1 ml-3">
        <Text style={{ color: danger ? colors.error : colors.foreground }} className="text-base font-medium">
          {title}
        </Text>
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
