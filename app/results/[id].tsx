import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import type { ThemeColorPalette } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type {
  ContentMapContent,
  ContentMapTopic,
  FlashcardContent,
  QuestionContent,
  SummaryContent,
} from "@shared/types";

type TabKey = "summary" | "map" | "flashcards" | "questions";
type ModeKey = "faithful" | "deepened" | "exam";
type FeedbackState = { kind: "success" | "error"; message: string } | null;

type ArtifactRecord = {
  id: number;
  type: "summary" | "content_map" | "flashcard" | "question";
  content: unknown;
  sourceChunkIds: unknown;
};

function toSourceIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function toSummaryContent(value: unknown): SummaryContent | null {
  if (!value || typeof value !== "object") return null;
  const content = value as Partial<SummaryContent>;
  if (typeof content.text !== "string" || content.text.trim().length === 0) return null;
  return {
    text: content.text,
    isComplement: Boolean(content.isComplement),
    section: content.section,
    notFoundInMaterial: Boolean(content.notFoundInMaterial),
  };
}

function toContentMap(value: unknown): ContentMapContent | null {
  if (!value || typeof value !== "object") return null;
  const content = value as Partial<ContentMapContent>;
  const title = typeof content.title === "string" ? content.title : "Mapa de Conteudo";
  const topics = Array.isArray(content.topics)
    ? content.topics
        .map((topic): ContentMapTopic | null => {
          if (!topic || typeof topic !== "object") return null;
          const rawTopic = topic as Partial<ContentMapTopic>;
          if (typeof rawTopic.title !== "string" || rawTopic.title.trim().length === 0) return null;
          return {
            title: rawTopic.title,
            subtopics: Array.isArray(rawTopic.subtopics)
              ? rawTopic.subtopics.filter((sub): sub is string => typeof sub === "string")
              : [],
            sourceChunkIds: toSourceIds(rawTopic.sourceChunkIds),
            section: rawTopic.section,
            isComplement: Boolean(rawTopic.isComplement),
          };
        })
        .filter((topic): topic is ContentMapTopic => topic !== null)
    : [];
  return {
    title,
    topics,
    notFoundInMaterial: Boolean(content.notFoundInMaterial),
  };
}

function toFlashcardContent(value: unknown): FlashcardContent | null {
  if (!value || typeof value !== "object") return null;
  const content = value as Partial<FlashcardContent>;
  if (typeof content.front !== "string" || typeof content.back !== "string") return null;
  return {
    front: content.front,
    back: content.back,
    level: content.level,
    difficultyTag: content.difficultyTag,
    isComplement: Boolean(content.isComplement),
    section: content.section,
    notFoundInMaterial: Boolean(content.notFoundInMaterial),
  };
}

function toQuestionContent(value: unknown): QuestionContent | null {
  if (!value || typeof value !== "object") return null;
  const content = value as Partial<QuestionContent>;
  const question = typeof content.question === "string" ? content.question : content.prompt;
  if (typeof question !== "string" || question.trim().length === 0) return null;
  const correctAnswer =
    typeof content.correctAnswer === "string" ? content.correctAnswer : (content.answerKey ?? "");
  const justification =
    typeof content.justification === "string"
      ? content.justification
      : (content.rationaleShort ?? "");
  return {
    type: content.type,
    prompt: content.prompt,
    question,
    options: Array.isArray(content.options)
      ? content.options.filter((option): option is string => typeof option === "string")
      : [],
    correctAnswer,
    answerKey: content.answerKey,
    justification,
    rationaleShort: content.rationaleShort,
    isComplement: Boolean(content.isComplement),
    section: content.section,
    notFoundInMaterial: Boolean(content.notFoundInMaterial),
  };
}

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

  const artifactsQuery = trpc.artifacts.list.useQuery(
    { documentId: docId, mode: activeMode },
    {
      enabled: docId > 0,
      staleTime: 0,
    },
  );
  const chunksQuery = trpc.chunks.list.useQuery(
    { documentId: docId },
    {
      enabled: docId > 0,
    },
  );

  const artifacts = useMemo(
    () => (artifactsQuery.data ?? []) as ArtifactRecord[],
    [artifactsQuery.data],
  );
  const chunks = chunksQuery.data ?? [];

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

  const summary = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "summary")
        .map((artifact) => ({
          artifact,
          content: toSummaryContent(artifact.content),
          sourceIds: toSourceIds(artifact.sourceChunkIds),
        }))
        .filter((entry) => entry.content !== null),
    [artifacts],
  );
  const contentMap = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "content_map")
        .map((artifact) => ({
          artifact,
          content: toContentMap(artifact.content),
        }))
        .find((entry) => entry.content !== null),
    [artifacts],
  );
  const flashcards = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "flashcard")
        .map((artifact) => ({
          artifact,
          content: toFlashcardContent(artifact.content),
          sourceIds: toSourceIds(artifact.sourceChunkIds),
        }))
        .filter((entry) => entry.content !== null),
    [artifacts],
  );
  const questions = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "question")
        .map((artifact) => ({
          artifact,
          content: toQuestionContent(artifact.content),
          sourceIds: toSourceIds(artifact.sourceChunkIds),
        }))
        .filter((entry) => entry.content !== null),
    [artifacts],
  );

  const handleGenerate = () => {
    if (docId <= 0) return;
    setFeedback(null);
    generateMutation.mutate({ documentId: docId, mode: activeMode });
  };

  const getChunkText = (chunkIds: number[]) => {
    if (chunkIds.length === 0) return [];
    return chunks.filter((chunk) => chunkIds.includes(chunk.id));
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

      <Modal visible={sourceModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-foreground">Fonte no Material</Text>
              <Pressable
                onPress={() => setSourceModal({ visible: false, chunkIds: [] })}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getChunkText(sourceModal.chunkIds).map((chunk) => (
                <View
                  key={chunk.id}
                  style={[styles.chunkBlock, { backgroundColor: colors.surface, borderColor: `${colors.primary}40` }]}
                >
                  <Text className="text-xs font-bold text-primary mb-1">Trecho #{chunk.chunkOrder + 1}</Text>
                  <Text className="text-sm text-foreground leading-5">{chunk.textContent}</Text>
                </View>
              ))}
              {getChunkText(sourceModal.chunkIds).length === 0 && (
                <Text className="text-base text-muted text-center py-8">Nenhuma fonte encontrada</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function FlashcardItem({
  front,
  back,
  level,
  isComplement,
  sourceIds,
  colors,
  onViewSource,
}: {
  front: string;
  back: string;
  level: string;
  isComplement: boolean;
  sourceIds: number[];
  colors: ThemeColorPalette;
  onViewSource: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Pressable
      onPress={() => setFlipped(!flipped)}
      style={[
        styles.flashcard,
        {
          backgroundColor: flipped ? `${colors.primary}10` : colors.surface,
          borderColor: flipped ? `${colors.primary}40` : colors.border,
        },
      ]}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View style={[styles.levelBadge, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={{ color: colors.primary }} className="text-xs font-semibold">
            {level}
          </Text>
        </View>
        {isComplement && (
          <View style={[styles.levelBadge, { backgroundColor: `${colors.warning}20` }]}>
            <Text style={{ color: colors.warning }} className="text-xs font-semibold">
              Complemento
            </Text>
          </View>
        )}
        <Text className="text-xs text-muted">{flipped ? "Resposta" : "Pergunta"}</Text>
      </View>
      <Text className="text-base text-foreground leading-6">{flipped ? back : front}</Text>
      {sourceIds.length > 0 && (
        <Pressable
          onPress={(event) => {
            event.stopPropagation?.();
            onViewSource();
          }}
          style={({ pressed }) => [styles.sourceBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <IconSymbol name="eye.fill" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary }} className="text-sm font-semibold ml-1">
            Ver fonte
          </Text>
        </Pressable>
      )}
    </Pressable>
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
  flashcard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  chunkBlock: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
});
