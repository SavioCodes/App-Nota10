import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as Haptics from "expo-haptics";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getSessionCardText, getSessionProgress } from "./session";

const { width } = Dimensions.get("window");

export default function ReviewSessionScreen() {
  const colors = useColors();
  const router = useRouter();

  const { data: reviewItems, isLoading } = trpc.review.today.useQuery();
  const answerMutation = trpc.review.answer.useMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(0);

  const currentItem = reviewItems?.[currentIndex];
  const { front: currentFront, back: currentBack } = getSessionCardText(currentItem);

  const handleAnswer = async (quality: number) => {
    if (!currentItem) return;

    if (Platform.OS !== "web") {
      if (quality >= 3) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    try {
      await answerMutation.mutateAsync({
        reviewItemId: currentItem.id,
        quality,
      });
    } catch {
      // Preserve study flow even if network write fails.
    }

    setCompleted((c) => c + 1);
    setFlipped(false);

    if (currentIndex + 1 < (reviewItems?.length || 0)) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(-1);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (currentIndex === -1 || !reviewItems || reviewItems.length === 0) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <IconSymbol name="checkmark.circle.fill" size={64} color={colors.success} />
          <Text className="text-2xl font-bold text-foreground">Sessao Completa!</Text>
          <Text className="text-base text-muted text-center">
            Voce revisou {completed} card(s). Continue assim para fixar o conteudo!
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.doneBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text className="text-background font-bold text-lg">Voltar</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const total = reviewItems.length;
  const progress = getSessionProgress(currentIndex, total);

  return (
    <ScreenContainer className="px-5 pt-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-row items-center justify-between mb-4">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="xmark" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-sm font-semibold text-muted">
          {currentIndex + 1} / {total}
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>

      <View className="flex-1 items-center justify-center">
        <Pressable
          onPress={() => setFlipped(!flipped)}
          style={[
            styles.card,
            {
              backgroundColor: flipped ? `${colors.primary}08` : colors.surface,
              borderColor: flipped ? `${colors.primary}40` : colors.border,
            },
          ]}
        >
          <Text className="text-xs text-muted mb-4">{flipped ? "RESPOSTA" : "PERGUNTA"}</Text>
          <Text className="text-xl font-medium text-foreground text-center leading-8">
            {flipped ? currentBack : currentFront}
          </Text>
          <Text className="text-sm text-muted mt-6">Toque para {flipped ? "ver pergunta" : "ver resposta"}</Text>
        </Pressable>
      </View>

      {flipped && (
        <View className="gap-2 pb-4">
          <Text className="text-sm text-muted text-center mb-2">Como foi?</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleAnswer(1)}
              style={({ pressed }) => [
                styles.answerBtn,
                {
                  backgroundColor: `${colors.error}15`,
                  borderColor: colors.error,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.error }} className="font-semibold text-sm">
                Errei
              </Text>
              <Text style={{ color: colors.error }} className="text-xs mt-0.5">
                Repetir
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleAnswer(3)}
              style={({ pressed }) => [
                styles.answerBtn,
                {
                  backgroundColor: `${colors.warning}15`,
                  borderColor: colors.warning,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.warning }} className="font-semibold text-sm">
                Dificil
              </Text>
              <Text style={{ color: colors.warning }} className="text-xs mt-0.5">
                ~1 dia
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleAnswer(4)}
              style={({ pressed }) => [
                styles.answerBtn,
                {
                  backgroundColor: `${colors.success}15`,
                  borderColor: colors.success,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.success }} className="font-semibold text-sm">
                Bom
              </Text>
              <Text style={{ color: colors.success }} className="text-xs mt-0.5">
                ~3 dias
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleAnswer(5)}
              style={({ pressed }) => [
                styles.answerBtn,
                {
                  backgroundColor: `${colors.primary}15`,
                  borderColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.primary }} className="font-semibold text-sm">
                Facil
              </Text>
              <Text style={{ color: colors.primary }} className="text-xs mt-0.5">
                ~7 dias
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {!flipped && (
        <View className="pb-4">
          <Pressable
            onPress={() => setFlipped(true)}
            style={({ pressed }) => [
              styles.showAnswerBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text className="text-background font-bold text-base">Mostrar Resposta</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  card: {
    width: width - 48,
    minHeight: 300,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  answerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  showAnswerBtn: {
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
  },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 8,
  },
});
