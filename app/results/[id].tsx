import { Text, View, Pressable, ScrollView, FlatList, ActivityIndicator, Modal } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { StyleSheet } from "react-native";

type TabKey = "summary" | "map" | "flashcards" | "questions";
type ModeKey = "faithful" | "deepened" | "exam";

export default function ResultsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const docId = parseInt(id || "0", 10);

  const [activeTab, setActiveTab] = useState<TabKey>((tab as TabKey) || "summary");
  const [activeMode, setActiveMode] = useState<ModeKey>("faithful");
  const [sourceModal, setSourceModal] = useState<{ visible: boolean; chunkIds: number[] }>({ visible: false, chunkIds: [] });
  const [selectedAnswer, setSelectedAnswer] = useState<Record<number, string>>({});
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

  const { data: artifacts, isLoading } = trpc.artifacts.list.useQuery({ documentId: docId, mode: activeMode });
  const { data: chunks } = trpc.chunks.list.useQuery({ documentId: docId });
  const generateMutation = trpc.artifacts.generate.useMutation();

  const summary = useMemo(() => artifacts?.filter(a => a.type === "summary") || [], [artifacts]);
  const contentMap = useMemo(() => artifacts?.find(a => a.type === "content_map"), [artifacts]);
  const flashcards = useMemo(() => artifacts?.filter(a => a.type === "flashcard") || [], [artifacts]);
  const questions = useMemo(() => artifacts?.filter(a => a.type === "question") || [], [artifacts]);

  const handleGenerate = () => {
    generateMutation.mutate({ documentId: docId, mode: activeMode });
  };

  const getChunkText = (chunkIds: number[]) => {
    if (!chunks) return [];
    return chunks.filter(c => chunkIds.includes(c.id));
  };

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "summary", label: "Resumo" },
    { key: "map", label: "Mapa" },
    { key: "flashcards", label: "Flashcards" },
    { key: "questions", label: "Questões" },
  ];

  const modes: Array<{ key: ModeKey; label: string }> = [
    { key: "faithful", label: "FIEL" },
    { key: "deepened", label: "APROFUNDAR" },
    { key: "exam", label: "PROVA" },
  ];

  return (
    <ScreenContainer className="pt-4">
      {/* Header */}
      <View className="flex-row items-center px-5 mb-3 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground flex-1">Resultados</Text>
      </View>

      {/* Mode Toggle */}
      <View style={[styles.modeRow, { borderColor: colors.border }]} className="mx-5 mb-3">
        {modes.map(m => (
          <Pressable
            key={m.key}
            onPress={() => setActiveMode(m.key)}
            style={[styles.modeBtn, activeMode === m.key && { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: activeMode === m.key ? colors.background : colors.muted }} className="text-xs font-bold">{m.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }} className="mb-3" style={{ flexGrow: 0 }}>
        {tabs.map(t => (
          <Pressable
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tabBtn, activeTab === t.key && { backgroundColor: colors.primary + "20", borderColor: colors.primary }]}
          >
            <Text style={{ color: activeTab === t.key ? colors.primary : colors.muted }} className="text-sm font-semibold">{t.label}</Text>
            {t.key === "flashcards" && flashcards.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                <Text className="text-background text-xs font-bold">{flashcards.length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading || generateMutation.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-base text-muted mt-4">
            {generateMutation.isPending ? "Gerando conteúdo..." : "Carregando..."}
          </Text>
        </View>
      ) : artifacts && artifacts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <IconSymbol name="lightbulb.fill" size={48} color={colors.muted} />
          <Text className="text-lg font-semibold text-foreground mt-4">Gerar Conteúdo</Text>
          <Text className="text-base text-muted mt-2 text-center">
            Toque no botão abaixo para gerar {activeMode === "faithful" ? "resumo fiel" : activeMode === "deepened" ? "conteúdo aprofundado" : "questões de prova"} para este documento.
          </Text>
          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => [styles.generateBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text className="text-background font-bold text-base">Gerar Agora</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Summary Tab */}
          {activeTab === "summary" && summary.map((item, i) => {
            const content = item.content as any;
            const sourceIds = (item.sourceChunkIds as any) || [];
            return (
              <View key={item.id} style={[styles.summaryItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {content.isComplement && (
                  <View style={[styles.complementBadge, { backgroundColor: colors.warning + "20" }]}>
                    <Text style={{ color: colors.warning }} className="text-xs font-semibold">Complemento</Text>
                  </View>
                )}
                {content.notFoundInMaterial && (
                  <View style={[styles.complementBadge, { backgroundColor: colors.error + "20" }]}>
                    <Text style={{ color: colors.error }} className="text-xs font-semibold">Sem fonte no material</Text>
                  </View>
                )}
                <Text className="text-base text-foreground leading-6">{content.text}</Text>
                {sourceIds.length > 0 && (
                  <Pressable
                    onPress={() => setSourceModal({ visible: true, chunkIds: sourceIds })}
                    style={({ pressed }) => [styles.sourceBtn, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <IconSymbol name="eye.fill" size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary }} className="text-sm font-semibold ml-1">Ver fonte</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* Map Tab */}
          {activeTab === "map" && contentMap && (() => {
            const mapContent = contentMap.content as any;
            return (
              <View>
                <Text className="text-xl font-bold text-foreground mb-4">{mapContent.title}</Text>
                {mapContent.topics?.map((topic: any, i: number) => (
                  <View key={i} style={[styles.topicCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text className="text-base font-semibold text-foreground">{topic.title}</Text>
                    {topic.subtopics?.map((sub: string, j: number) => (
                      <View key={j} className="flex-row items-start mt-1.5 ml-2 gap-2">
                        <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                        <Text className="text-sm text-foreground flex-1">{sub}</Text>
                      </View>
                    ))}
                    {topic.sourceChunkIds?.length > 0 && (
                      <Pressable
                        onPress={() => setSourceModal({ visible: true, chunkIds: topic.sourceChunkIds })}
                        style={({ pressed }) => [styles.sourceBtn, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <IconSymbol name="eye.fill" size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary }} className="text-sm font-semibold ml-1">Ver fonte</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Flashcards Tab */}
          {activeTab === "flashcards" && flashcards.map((item, i) => {
            const content = item.content as any;
            const sourceIds = (item.sourceChunkIds as any) || [];
            const levelLabels: Record<string, string> = {
              definition: "Definição",
              cause_effect: "Causa/Efeito",
              comparison: "Comparação",
              example: "Exemplo",
              trick: "Pegadinha",
            };
            return (
              <FlashcardItem
                key={item.id}
                front={content.front}
                back={content.back}
                level={levelLabels[content.level] || content.level}
                isComplement={content.isComplement}
                sourceIds={sourceIds}
                colors={colors}
                onViewSource={() => setSourceModal({ visible: true, chunkIds: sourceIds })}
              />
            );
          })}

          {/* Questions Tab */}
          {activeTab === "questions" && questions.map((item, i) => {
            const content = item.content as any;
            const sourceIds = (item.sourceChunkIds as any) || [];
            const isAnswered = showAnswers[item.id];
            return (
              <View key={item.id} style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text className="text-sm font-bold text-primary mb-1">Questão {i + 1}</Text>
                <Text className="text-base text-foreground mb-3">{content.question}</Text>
                {content.options?.map((opt: string, j: number) => {
                  const isSelected = selectedAnswer[item.id] === opt;
                  const isCorrect = opt === content.correctAnswer;
                  return (
                    <Pressable
                      key={j}
                      onPress={() => {
                        if (!isAnswered) {
                          setSelectedAnswer(prev => ({ ...prev, [item.id]: opt }));
                          setShowAnswers(prev => ({ ...prev, [item.id]: true }));
                        }
                      }}
                      style={[
                        styles.optionBtn,
                        { borderColor: colors.border },
                        isAnswered && isCorrect && { borderColor: colors.success, backgroundColor: colors.success + "10" },
                        isAnswered && isSelected && !isCorrect && { borderColor: colors.error, backgroundColor: colors.error + "10" },
                      ]}
                    >
                      <Text className="text-sm text-foreground">{opt}</Text>
                    </Pressable>
                  );
                })}
                {isAnswered && (
                  <View style={[styles.justification, { backgroundColor: colors.primary + "10" }]}>
                    <Text className="text-sm font-semibold text-primary mb-1">Justificativa:</Text>
                    <Text className="text-sm text-foreground">{content.justification}</Text>
                  </View>
                )}
                {sourceIds.length > 0 && (
                  <Pressable
                    onPress={() => setSourceModal({ visible: true, chunkIds: sourceIds })}
                    style={({ pressed }) => [styles.sourceBtn, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <IconSymbol name="eye.fill" size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary }} className="text-sm font-semibold ml-1">Ver fonte</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Source Modal */}
      <Modal visible={sourceModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-foreground">Fonte no Material</Text>
              <Pressable onPress={() => setSourceModal({ visible: false, chunkIds: [] })} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getChunkText(sourceModal.chunkIds).map((chunk, i) => (
                <View key={chunk.id} style={[styles.chunkBlock, { backgroundColor: colors.surface, borderColor: colors.primary + "40" }]}>
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

function FlashcardItem({ front, back, level, isComplement, sourceIds, colors, onViewSource }: {
  front: string; back: string; level: string; isComplement: boolean; sourceIds: number[]; colors: any; onViewSource: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Pressable
      onPress={() => setFlipped(!flipped)}
      style={[styles.flashcard, { backgroundColor: flipped ? colors.primary + "10" : colors.surface, borderColor: flipped ? colors.primary + "40" : colors.border }]}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View style={[styles.levelBadge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={{ color: colors.primary }} className="text-xs font-semibold">{level}</Text>
        </View>
        {isComplement && (
          <View style={[styles.levelBadge, { backgroundColor: colors.warning + "20" }]}>
            <Text style={{ color: colors.warning }} className="text-xs font-semibold">Complemento</Text>
          </View>
        )}
        <Text className="text-xs text-muted">{flipped ? "Resposta" : "Pergunta"}</Text>
      </View>
      <Text className="text-base text-foreground leading-6">{flipped ? back : front}</Text>
      {sourceIds.length > 0 && (
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onViewSource(); }}
          style={({ pressed }) => [styles.sourceBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <IconSymbol name="eye.fill" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary }} className="text-sm font-semibold ml-1">Ver fonte</Text>
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
