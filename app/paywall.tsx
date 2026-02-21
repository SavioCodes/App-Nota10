import * as Linking from "expo-linking";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import type { ThemeColorPalette } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { BillingCatalogPlan } from "@/shared/billing";

const planFeatureMap: Record<"pro" | "pro_enem", string[]> = {
  pro: [
    "Conversoes ilimitadas",
    "Exportacao PDF",
    "Modo Aprofundar",
    "Revisao espaciada completa",
    "Suporte prioritario",
  ],
  pro_enem: [
    "Tudo do Pro",
    "Modo Prova (questoes estilo ENEM)",
    "Banco de questoes por competencia",
    "Simulados personalizados",
    "Analise de desempenho",
  ],
};

type PurchaseError = {
  userCancelled?: boolean;
};

type PlanCard = {
  id: "pro" | "pro_enem";
  name: string;
  webProductId: string;
  iosProductId: string;
  androidProductId: string;
  price: string;
  period: string;
  features: string[];
  recommended: boolean;
};

const DEFAULT_PRODUCT_IDS = {
  pro: "nota10_pro_monthly",
  proEnem: "nota10_pro_enem_monthly",
};

const fallbackPlans: PlanCard[] = [
  {
    id: "pro",
    name: "Pro",
    webProductId: DEFAULT_PRODUCT_IDS.pro,
    iosProductId: DEFAULT_PRODUCT_IDS.pro,
    androidProductId: DEFAULT_PRODUCT_IDS.pro,
    price: "R$ 29,90",
    period: "/mes",
    features: planFeatureMap.pro,
    recommended: true,
  },
  {
    id: "pro_enem",
    name: "Pro+ ENEM",
    webProductId: DEFAULT_PRODUCT_IDS.proEnem,
    iosProductId: DEFAULT_PRODUCT_IDS.proEnem,
    androidProductId: DEFAULT_PRODUCT_IDS.proEnem,
    price: "R$ 49,90",
    period: "/mes",
    features: planFeatureMap.pro_enem,
    recommended: false,
  },
];

function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function isPurchaseCancellationError(error: unknown): error is PurchaseError {
  if (!error || typeof error !== "object") return false;
  return "userCancelled" in error;
}

function getCheckoutBackUrl(): string {
  const configured = (process.env.EXPO_PUBLIC_MERCADOPAGO_RETURN_URL ?? "").trim();
  if (configured.length > 0) return configured;

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/paywall`;
  }

  if (Platform.OS !== "web") {
    return Linking.createURL("/paywall");
  }

  return "https://www.mercadopago.com.br";
}

function toPlanCards(catalog: BillingCatalogPlan[] | undefined): PlanCard[] {
  if (!catalog || catalog.length === 0) return fallbackPlans;

  const mapped = catalog
    .filter((plan) => plan.enabled)
    .map((plan) => ({
      id: plan.id,
      name: plan.displayName,
      webProductId: plan.webProductId,
      iosProductId: plan.iosProductId,
      androidProductId: plan.androidProductId,
      price: formatBrl(plan.monthlyPriceCents),
      period: "/mes",
      features: planFeatureMap[plan.id],
      recommended: plan.id === "pro",
    }));

  return mapped.length > 0 ? mapped : fallbackPlans;
}

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: catalog } = trpc.billing.catalog.useQuery(undefined, { enabled: isAuthenticated });
  const webCheckoutMutation = trpc.billing.webCreateSubscription.useMutation();

  const [isSyncingPlan, setIsSyncingPlan] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const plans = useMemo(() => toPlanCards(catalog), [catalog]);

  const handleSubscribe = async (plan: PlanCard) => {
    if (!isAuthenticated) {
      Alert.alert("Login necessario", "Faca login para assinar um plano.");
      return;
    }

    setLoadingPlanId(plan.id);

    try {
      const result = await webCheckoutMutation.mutateAsync({
        webProductId: plan.webProductId,
        backUrl: getCheckoutBackUrl(),
      });

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.location.href = result.checkoutUrl;
        }
        return;
      }

      const canOpen = await Linking.canOpenURL(result.checkoutUrl);
      if (!canOpen) {
        Alert.alert("Erro", "Nao foi possivel abrir o checkout.");
        return;
      }

      await Linking.openURL(result.checkoutUrl);
      Alert.alert("Checkout aberto", "Finalize a assinatura no Mercado Pago e depois sincronize seu plano.");
    } catch (error: unknown) {
      const userCancelled = isPurchaseCancellationError(error) && Boolean(error.userCancelled);
      if (!userCancelled) {
        Alert.alert("Erro na compra", "Nao foi possivel concluir a assinatura agora.");
      }
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleSyncPlan = async () => {
    setIsSyncingPlan(true);
    try {
      await utils.usage.today.invalidate();
      Alert.alert("Sincronizado", "Plano atualizado com sucesso.");
    } catch {
      Alert.alert("Erro", "Nao foi possivel sincronizar o plano agora.");
    } finally {
      setIsSyncingPlan(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-row items-center mb-4 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Planos</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6">
          <View style={[styles.crownCircle, { backgroundColor: `${colors.primary}20` }]}>
            <IconSymbol name="crown.fill" size={40} color={colors.primary} />
          </View>
          <Text className="text-2xl font-bold text-foreground mt-4">Desbloqueie todo o potencial</Text>
          <Text className="text-base text-muted mt-2 text-center px-4">
            Estude sem limites e tenha acesso a todos os recursos do Nota10.
          </Text>
        </View>

        <View style={[styles.freePlan, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text className="text-base font-semibold text-foreground mb-2">Plano Gratuito</Text>
          <View className="gap-1.5">
            <FeatureRow text="3 conversoes/dia" included={true} colors={colors} />
            <FeatureRow text="Modo Fiel apenas" included={true} colors={colors} />
            <FeatureRow text="Exportacao PDF" included={false} colors={colors} />
            <FeatureRow text="Modo Aprofundar" included={false} colors={colors} />
            <FeatureRow text="Modo Prova" included={false} colors={colors} />
          </View>
        </View>

        {plans.map((plan) => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              { backgroundColor: colors.surface, borderColor: plan.recommended ? colors.primary : colors.border },
              plan.recommended && { borderWidth: 2 },
            ]}
          >
            {plan.recommended && (
              <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
                <Text className="text-background text-xs font-bold">RECOMENDADO</Text>
              </View>
            )}
            <Text className="text-lg font-bold text-foreground">{plan.name}</Text>
            <View className="flex-row items-baseline mt-1">
              <Text className="text-3xl font-bold text-primary">{plan.price}</Text>
              <Text className="text-sm text-muted ml-1">{plan.period}</Text>
            </View>
            <View className="mt-4 gap-2">
              {plan.features.map((feature, index) => (
                <FeatureRow key={`${plan.id}-${index}`} text={feature} included={true} colors={colors} />
              ))}
            </View>
            <Pressable
              onPress={() => handleSubscribe(plan)}
              disabled={loadingPlanId !== null}
              style={({ pressed }) => [
                styles.subscribeBtn,
                {
                  backgroundColor: plan.recommended ? colors.primary : colors.surface,
                  borderColor: colors.primary,
                  borderWidth: plan.recommended ? 0 : 1.5,
                  opacity: loadingPlanId !== null ? 0.7 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              {loadingPlanId === plan.id ? (
                <ActivityIndicator color={plan.recommended ? colors.background : colors.primary} />
              ) : (
                <Text
                  style={{ color: plan.recommended ? colors.background : colors.primary }}
                  className="font-bold text-base"
                >
                  Assinar {plan.name}
                </Text>
              )}
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={handleSyncPlan}
          disabled={isSyncingPlan}
          style={({ pressed }) => [
            styles.restoreBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: isSyncingPlan ? 0.7 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {isSyncingPlan ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text className="text-sm font-semibold text-primary">Sincronizar plano</Text>
          )}
        </Pressable>

        <Text className="text-xs text-muted text-center mt-4 px-4">
          Assinaturas sao processadas via Mercado Pago.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function FeatureRow({
  text,
  included,
  colors,
}: {
  text: string;
  included: boolean;
  colors: ThemeColorPalette;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <IconSymbol
        name={included ? "checkmark.circle.fill" : "xmark.circle.fill"}
        size={18}
        color={included ? colors.success : colors.muted}
      />
      <Text style={{ color: included ? colors.foreground : colors.muted }} className="text-sm">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  crownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  freePlan: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  planCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  recommendedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  subscribeBtn: {
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 16,
  },
  restoreBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    marginTop: 4,
  },
});
