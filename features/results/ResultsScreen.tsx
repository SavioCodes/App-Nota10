import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import type { ThemeColorPalette } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { FlashcardItem } from "./components/FlashcardItem";
import { SourceModal } from "./components/SourceModal";
import { useResultsData } from "./use-results-data";

type TabKey = "summary" | "map" | "flashcards" | "questions";
type ModeKey = "faithful" | "deepened" | "exam";
type FeedbackState = { kind: "success" | "error"; message: string } | null;

export default function ResultsScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const docId = Number.parseInt(id || "0", 10);

  const [activeTab, setActiveTab] = useState<TabKey>((tab as TabKey) || "summary");
  const [activeMode, setActiveMode] = useState<ModeKey>("faithful");
  const [sourceModal, setSourceModal] = useState<{ visible: boolean; chunkIds: number[] }>({
    visible: false,
    chunkIds: [],
  });
  const [selectedAnswer, setSelectedAnswer] = useState<Record<number, string>>({});
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const { artifactsQuery, artifacts, summary, contentMap, flashcards, questions, getChunkText } =
    useResultsData({ docId, activeMode });

  const generateMutation = trpc.artifacts.generate.useMutation({
    onSuccess: async (result, variables) => {
      await Promise.all([
        utils.artifacts.list.invalidate({
          documentId: docId,
          mode: variables.mode,
        }),
        utils.review.today.invalidate(),
        utils.review.all.invalidate(),
      ]);

      const message = result.cached
        ? "Conteudo deste modo ja estava atualizado."
        : "Conteudo gerado com sucesso.";
      setFeedback({ kind: "success", message });
    },
    onError: (error) => {
      const message = error.message || "Nao foi possivel gerar conteudo agora.";
      if (message.includes("LIMIT_REACHED")) {
        Alert.alert("Limite atingido", "Voce atingiu o limite diario do plano gratuito.");
        setFeedback({ kind: "error", message: "Limite diario atingido. Faca upgrade para continuar." });
        return;
      }
      if (message.includes("RATE_LIMITED")) {
        setFeedback({ kind: "error", message: "Muitas solicitacoes seguidas. Aguarde alguns segundos." });
        return;
      }
      setFeedback({ kind: "error", message });
    },
  });

  const handleGenerate = () => {
    if (docId <= 0) return;
    setFeedback(null);
    generateMutation.mutate({ documentId: docId, mode: activeMode });
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "summary", label: "Resumo" },
    { key: "map", label: "Mapa" },
    { key: "flashcards", label: "Flashcards" },
    { key: "questions", label: "Questoes" },
  ];

  const modes: { key: ModeKey; label: string }[] = [
    { key: "faithful", label: "FIEL" },
    { key: "deepened", label: "APROFUNDAR" },
    { key: "exam", label: "PROVA" },
  ];

  const isLoading = artifactsQuery.isLoading || generateMutation.isPending;

  return (
    <ScreenContainer className="pt-4">
      <View className="flex-row items-center px-5 mb-3 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground flex-1">Resultados</Text>
        <Pressable
          onPress={handleGenerate}
          disabled={generateMutation.isPending || docId <= 0}
          style={({ pressed }) => [
            styles.generateSmallButton,
            {
              borderColor: colors.primary,
              opacity: generateMutation.isPending ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.primary }} className="text-xs font-semibold">
            Gerar
          </Text>
        </Pressable>
      </View>

      <View style={[styles.modeRow, { borderColor: colors.border }]} className="mx-5 mb-3">
        {modes.map((mode) => (
          <Pressable
            key={mode.key}
            onPress={() => {
              setFeedback(null);
              setActiveMode(mode.key);
            }}
            style={[styles.modeBtn, activeMode === mode.key && { backgroundColor: colors.primary }]}
          >
            <Text
              style={{ color: activeMode === mode.key ? colors.background : colors.muted }}
              className="text-xs font-bold"
            >
              {mode.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {feedback && (
        <View
          className="mx-5 mb-3 rounded-xl px-3 py-2"
          style={{
            backgroundColor:
              feedback.kind === "success" ? `${colors.success}20` : `${colors.error}20`,
            borderColor: feedback.kind === "success" ? colors.success : colors.error,
            borderWidth: 1,
          }}
        >
          <Text
            className="text-sm"
            style={{ color: feedback.kind === "success" ? colors.success : colors.error }}
          >
            {feedback.message}
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
        className="mb-3"
        style={{ flexGrow: 0 }}
      >
        {tabs.map((tabItem) => (
          <Pressable
            key={tabItem.key}
            onPress={() => setActiveTab(tabItem.key)}
            style={[
              styles.tabBtn,
              activeTab === tabItem.key && {
                backgroundColor: `${colors.primary}20`,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text
              style={{ color: activeTab === tabItem.key ? colors.primary : colors.muted }}
              className="text-sm font-semibold"
            >
              {tabItem.label}
            </Text>
            {tabItem.key === "flashcards" && flashcards.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                <Text className="text-background text-xs font-bold">{flashcards.length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-base text-muted mt-4">
            {generateMutation.isPending ? "Gerando conteudo..." : "Carregando..."}
          </Text>
        </View>
      ) : artifacts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <IconSymbol name="lightbulb.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-foreground mt-4">Gerar Conteudo</Text>
          <Text className="text-base text-muted mt-2 text-center">
            Toque para gerar {activeMode === "faithful" ? "conteudo fiel" : activeMode === "deepened" ? "conteudo aprofundado" : "questoes de prova"}.
          </Text>
          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => [
              styles.generateBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text className="text-background font-bold text-base">Gerar Agora</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "summary" &&
            summary.map((entry) => {
              const content = entry.content;
              if (!content) return null;
              return (
                <View
                  key={entry.artifact.id}
                  style={[styles.summaryItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {content.isComplement && (
                    <View style={[styles.complementBadge, { backgroundColor: `${colors.warning}20` }]}>
                      <Text style={{ color: colors.warning }} className="text-xs font-semibold">
                        Complemento
                      </Text>
                    </View>
                  )}
                  {content.notFoundInMaterial && (
                    <View style={[styles.complementBadge, { backgroundColor: `${colors.error}20` }]}>
                      <Text style={{ color: colors.error }} className="text-xs font-semibold">
                        Sem fonte no material
                      </Text>
                    </View>
                  )}
                  <Text className="text-base text-foreground leading-6">{content.text}</Text>
                  {entry.sourceIds.length > 0 && (
                    <Pressable
                      onPress={() => setSourceModal({ visible: true, chunkIds: entry.sourceIds })}
                      style={({ pressed }) => [styles.sourceBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <IconSymbol name="eye.fill" size={14} color={colors.primary} />
                      <Text style={{ color: colors.primary }} className="text-sm font-semibold ml-1">
                        Ver fonte
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}

          {activeTab === "map" && contentMap?.content && (
            <View>
              <Text className="text-xl font-bold text-foreground mb-4">{contentMap.content.title}</Text>
              {contentMap.content.topics.map((topic, index) => (
                <View
                  key={`${topic.title}-${index}`}
                  style={[styles.topicCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text className="text-base font-semibold text-foreground">{topic.title}</Text>
                  {topic.subtopics.map((subtopic, subIndex) => (
                    <View key={`${topic.title}-${subIndex}`} className="flex-row items-start mt-1.5 ml-2 gap-2">
                      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                      <Text className="text-sm text-foreground flex-1">{subtopic}</Text>
                    </View>
                  ))}
                  {(topic.sourceChunkIds ?? []).length > 0 && (
                    <Pressable
                      onPress={() =>
                        setSourceModal({
                          visible: true,
                          chunkIds: topic.sourceChunkIds ?? [],
                        })
                      }
                      style={({ pressed }) => [styles.sourceBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <IconSymbol name="eye.fill" size={14} color={colors.primary} />
                      <Text style={{ color: colors.primary }} className="text-sm font-semibold ml-1">
                        Ver fonte
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {activeTab === "flashcards" &&
            flashcards.map((entry) => {
              const content = entry.content;
              if (!content) return null;
              const tag = content.level ?? content.difficultyTag ?? "definition";
              const levelLabels: Record<string, string> = {
                definition: "Definicao",
                cause_effect: "Causa/Efeito",
                comparison: "Comparacao",
                example: "Exemplo",
                trick: "Pegadinha",
              };
              const label = levelLabels[tag] ?? tag;
              return (
                <FlashcardItem
                  key={entry.artifact.id}
                  front={content.front}
                  back={content.back}
                  level={label}
                  isComplement={content.isComplement}
                  sourceIds={entry.sourceIds}
                  colors={colors}
                  onViewSource={() => setSourceModal({ visible: true, chunkIds: entry.sourceIds })}
                />
              );
            })}

          {activeTab === "questions" &&
            questions.map((entry, index) => {
              const content = entry.content;
              if (!content) return null;
              const isAnswered = Boolean(showAnswers[entry.artifact.id]);
              const questionText = content.question || content.prompt || "Pergunta indisponivel";
              return (
                <View
                  key={entry.artifact.id}
                  style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text className="text-sm font-bold text-primary mb-1">Questao {index + 1}</Text>
                  <Text className="text-base text-foreground mb-3">{questionText}</Text>
                  {content.options.map((option, optionIndex) => {
                    const isSelected = selectedAnswer[entry.artifact.id] === option;
                    const isCorrect = option === content.correctAnswer;
                    return (
                      <Pressable
                        key={`${entry.artifact.id}-${optionIndex}`}
                        onPress={() => {
                          if (isAnswered) return;
                          setSelectedAnswer((current) => ({ ...current, [entry.artifact.id]: option }));
                          setShowAnswers((current) => ({ ...current, [entry.artifact.id]: true }));
                        }}
                        style={[
                          styles.optionBtn,
                          { borderColor: colors.border },
                          isAnswered &&
                            isCorrect && {
                              borderColor: colors.success,
                              backgroundColor: `${colors.success}10`,
                            },
                          isAnswered &&
                            isSelected &&
                            !isCorrect && {
                              borderColor: colors.error,
                              backgroundColor: `${colors.error}10`,
                            },
                        ]}
                      >
                        <Text className="text-sm text-foreground">{option}</Text>
                      </Pressable>
                    );
                  })}
                  {isAnswered && (
                    <View style={[styles.justification, { backgroundColor: `${colors.primary}10` }]}>
                      <Text className="text-sm font-semibold text-primary mb-1">Justificativa:</Text>
                      <Text className="text-sm text-foreground">
                        {content.justification || "Sem justificativa disponivel."}
                      </Text>
                    </View>
                  )}
                  {entry.sourceIds.length > 0 && (
                    <Pressable
                      onPress={() => setSourceModal({ visible: true, chunkIds: entry.sourceIds })}
                      style={({ pressed }) => [styles.sourceBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <IconSymbol name="eye.fill" size={14} color={colors.primary} />
                      <Text style={{ color: colors.primary }} className="text-sm font-semibold ml-1">
                        Ver fonte
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
        </ScrollView>
      )}

      <SourceModal
        visible={sourceModal.visible}
        chunkIds={sourceModal.chunkIds}
        chunks={getChunkText(sourceModal.chunkIds)}
        colors={colors as ThemeColorPalette}
        onClose={() => setSourceModal({ visible: false, chunkIds: [] })}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 4,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  summaryItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  complementBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  sourceBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 4,
  },
  topicCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  questionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionBtn: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  justification: {
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  generateBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 16,
  },
  generateSmallButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
