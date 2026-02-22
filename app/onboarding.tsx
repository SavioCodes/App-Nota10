import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useRef } from "react";
import { startOAuthLogin } from "@/constants/oauth";
import { appLogger } from "@/lib/_core/logger";

const { width } = Dimensions.get("window");

const slides = [
  {
    icon: "eye.fill" as const,
    title: "Fiel ao Material",
    description: "Cada resumo, flashcard e questão vem com a fonte exata do seu material. Sem invenções, sem alucinações.",
    color: "#6C5CE7",
  },
  {
    icon: "lightbulb.fill" as const,
    title: "Questões de Prova",
    description: "Questões de múltipla escolha com gabarito e justificativa. Pegadinhas, comparações e exemplos para você arrasar na prova.",
    color: "#00C48C",
  },
  {
    icon: "clock.fill" as const,
    title: "Revisão Espaçada",
    description: "Algoritmo inteligente que mostra os flashcards no momento certo para fixar o conteúdo na memória de longo prazo.",
    color: "#FF6B6B",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleLogin = async () => {
    const loginUrl = await startOAuthLogin();
    if (loginUrl) return;

    appLogger.warn("auth.login_not_started_from_onboarding");
    Alert.alert(
      "Nao foi possivel entrar",
      "Confira as configuracoes de autenticacao (Supabase/OAuth) e tente novamente.",
    );
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      void handleLogin();
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1">
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={[styles.iconCircle, { backgroundColor: item.color + "20" }]}>
                <IconSymbol name={item.icon} size={56} color={item.color} />
              </View>
              <Text className="text-2xl font-bold text-foreground mt-8 text-center">{item.title}</Text>
              <Text className="text-base text-muted mt-3 text-center px-10 leading-6">{item.description}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View className="flex-row items-center justify-center gap-2 mb-6">
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentIndex ? colors.primary : colors.border },
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View className="px-6 pb-8 gap-3">
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <Text className="text-background font-bold text-lg">
              {currentIndex < slides.length - 1 ? "Próximo" : "Começar"}
            </Text>
          </Pressable>
          {currentIndex < slides.length - 1 && (
            <Pressable
              onPress={() => {
                void handleLogin();
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignItems: "center", paddingVertical: 8 }]}
            >
              <Text className="text-muted text-base">Pular</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
  },
});
