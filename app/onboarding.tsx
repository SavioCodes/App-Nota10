import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { appLogger } from "@/lib/_core/logger";
import { markOnboardingCompleted } from "@/lib/_core/onboarding";

type AuthMode = "login" | "signup";

const FEATURE_ITEMS = [
  {
    icon: "eye.fill" as const,
    title: "Fiel ao seu conteudo",
    description: "Resumos e flashcards conectados com a fonte real do seu material.",
    color: "#3B82F6",
  },
  {
    icon: "lightbulb.fill" as const,
    title: "Treino inteligente",
    description: "Questoes no estilo prova e explicacoes objetivas para fixar rapido.",
    color: "#10B981",
  },
  {
    icon: "clock.fill" as const,
    title: "Revisao no tempo certo",
    description: "Repeticao espacada para lembrar mais e esquecer menos.",
    color: "#F59E0B",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [actionsReady, setActionsReady] = useState(false);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(18)).current;
  const actionOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const cardAnimations = useRef(FEATURE_ITEMS.map(() => new Animated.Value(0))).current;

  const backgroundGlow = useMemo(
    () => [
      { color: `${colors.primary}1A`, top: -40, left: -30, size: 180 },
      { color: `${colors.success}14`, top: 90, right: -40, size: 130 },
      { color: `${colors.warning}14`, bottom: 180, left: -20, size: 140 },
    ],
    [colors.primary, colors.success, colors.warning],
  );

  useEffect(() => {
    const introAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(
        110,
        cardAnimations.map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ),
      ),
      Animated.timing(actionOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]);

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.04,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    introAnimation.start(({ finished }) => {
      if (finished) {
        setActionsReady(true);
      }
    });
    pulseAnimation.start();

    return () => {
      introAnimation.stop();
      pulseAnimation.stop();
    };
  }, [actionOpacity, cardAnimations, heroOpacity, heroTranslateY, logoScale]);

  const moveToAuth = async (mode: AuthMode) => {
    await markOnboardingCompleted();
    router.replace({
      pathname: "/auth",
      params: { mode },
    });
  };

  const skipIntro = async () => {
    appLogger.info("onboarding.skipped");
    await moveToAuth("login");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6 pb-8">
      <View style={styles.root}>
        {backgroundGlow.map((glow, index) => (
          <View
            key={`glow-${index}`}
            style={[
              styles.glow,
              {
                backgroundColor: glow.color,
                width: glow.size,
                height: glow.size,
                top: glow.top,
                left: glow.left,
                right: glow.right,
                bottom: glow.bottom,
              },
            ]}
          />
        ))}

        <Pressable onPress={() => void skipIntro()} style={styles.skipAction}>
          <Text style={[styles.skipText, { color: colors.muted }]}>Pular</Text>
        </Pressable>

        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroOpacity,
              transform: [{ translateY: heroTranslateY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoBadge,
              {
                backgroundColor: colors.primary,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Text style={[styles.logoText, { color: colors.background }]}>N</Text>
          </Animated.View>
          <Text style={[styles.title, { color: colors.foreground }]}>Bem-vindo ao Nota10</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Uma experiencia simples para estudar melhor desde o primeiro minuto.</Text>
        </Animated.View>

        <View style={styles.cards}>
          {FEATURE_ITEMS.map((item, index) => {
            const animationValue = cardAnimations[index];
            return (
              <Animated.View
                key={item.title}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: animationValue,
                    transform: [
                      {
                        translateY: animationValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [14, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.cardIcon, { backgroundColor: `${item.color}20` }]}>
                  <IconSymbol name={item.icon} size={18} color={item.color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.cardDescription, { color: colors.muted }]}>{item.description}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View style={[styles.actions, { opacity: actionOpacity }]}>
          <Pressable
            disabled={!actionsReady}
            onPress={() => void moveToAuth("signup")}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: !actionsReady ? 0.55 : pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.primaryButtonLabel, { color: colors.background }]}>Criar conta</Text>
          </Pressable>

          <Pressable
            disabled={!actionsReady}
            onPress={() => void moveToAuth("login")}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: !actionsReady ? 0.55 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonLabel, { color: colors.foreground }]}>Ja tenho conta</Text>
          </Pressable>

          <Text style={[styles.footerHint, { color: colors.muted }]}>Cadastro por e-mail com confirmacao para proteger sua conta.</Text>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "space-between",
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
  },
  skipAction: {
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  hero: {
    marginTop: 12,
    alignItems: "center",
    gap: 12,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 34,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 6,
  },
  cards: {
    gap: 12,
    marginTop: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  footerHint: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
