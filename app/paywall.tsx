import { Text, View, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePurchases } from "@/lib/purchases-provider";
import { REVENUECAT_PRODUCT_IDS } from "@/constants/revenuecat";
import { trpc } from "@/lib/trpc";

const plans = [
  {
    id: "pro",
    name: "Pro",
    productId: REVENUECAT_PRODUCT_IDS.pro,
    price: "R$ 29,90",
    period: "/mes",
    features: [
      "Conversoes ilimitadas",
      "Exportacao PDF",
      "Modo Aprofundar",
      "Revisao espaciada completa",
      "Suporte prioritario",
    ],
    recommended: true,
  },
  {
    id: "pro_enem",
    name: "Pro+ ENEM",
    productId: REVENUECAT_PRODUCT_IDS.proEnem,
    price: "R$ 49,90",
    period: "/mes",
    features: [
      "Tudo do Pro",
      "Modo Prova (questoes estilo ENEM)",
      "Banco de questoes por competencia",
      "Simulados personalizados",
      "Analise de desempenho",
    ],
    recommended: false,
  },
] as const;

export default function PaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isSupported, isReady, purchaseByProductId, restorePurchases } = usePurchases();
  const utils = trpc.useUtils();
  const [isRestoring, setIsRestoring] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handleSubscribe = async (plan: (typeof plans)[number]) => {
    if (!isAuthenticated) {
      Alert.alert("Login necessario", "Faca login para assinar um plano.");
      return;
    }

    if (!isSupported) {
      Alert.alert("Indisponivel", "A compra no app esta disponivel apenas no iOS/Android.");
      return;
    }

    if (!isReady) {
      Alert.alert("Aguarde", "Inicializando pagamentos. Tente novamente em alguns segundos.");
      return;
    }

    setLoadingPlanId(plan.id);
    try {
      await purchaseByProductId(plan.productId);
      await utils.usage.today.invalidate();
      Alert.alert(
        "Assinatura concluida",
        "Compra registrada com sucesso. Seu plano sera atualizado automaticamente.",
      );
      router.back();
    } catch (error: any) {
      const userCancelled = Boolean(error?.userCancelled);
      if (!userCancelled) {
        Alert.alert("Erro na compra", "Nao foi possivel concluir a assinatura agora.");
      }
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleRestore = async () => {
    if (!isSupported) {
      Alert.alert("Indisponivel", "Restauracao disponivel apenas no iOS/Android.");
      return;
    }

    setIsRestoring(true);
    try {
      await restorePurchases();
      await utils.usage.today.invalidate();
      Alert.alert("Restaurado", "Compras restauradas com sucesso.");
    } catch (error) {
      Alert.alert("Erro", "Nao foi possivel restaurar as compras.");
    } finally {
      setIsRestoring(false);
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
          <View style={[styles.crownCircle, { backgroundColor: colors.primary + "20" }]}>
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
              {plan.features.map((feature, i) => (
                <FeatureRow key={i} text={feature} included={true} colors={colors} />
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
                <Text style={{ color: plan.recommended ? colors.background : colors.primary }} className="font-bold text-base">
                  Assinar {plan.name}
                </Text>
              )}
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={handleRestore}
          disabled={isRestoring}
          style={({ pressed }) => [
            styles.restoreBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: isRestoring ? 0.7 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {isRestoring ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text className="text-sm font-semibold text-primary">Restaurar Compras</Text>
          )}
        </Pressable>

        <Text className="text-xs text-muted text-center mt-4 px-4">
          A assinatura sera cobrada na sua conta da App Store/Google Play. Cancele a qualquer momento nas configuracoes da loja.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function FeatureRow({ text, included, colors }: { text: string; included: boolean; colors: any }) {
  return (
    <View className="flex-row items-center gap-2">
      <IconSymbol
        name={included ? "checkmark.circle.fill" : "xmark.circle.fill"}
        size={18}
        color={included ? colors.success : colors.muted}
      />
      <Text style={{ color: included ? colors.foreground : colors.muted }} className="text-sm">{text}</Text>
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
