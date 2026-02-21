import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { ThemeColorPalette } from "@/constants/theme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type {
  ContentMapContent,
  FlashcardContent,
  QuestionContent,
  SummaryContent,
} from "@shared/types";

type ArtifactRecord = {
  id: number;
  type: "summary" | "content_map" | "flashcard" | "question";
  content: unknown;
};

function asSummaryContent(value: unknown): SummaryContent | null {
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

function asContentMap(value: unknown): ContentMapContent | null {
  if (!value || typeof value !== "object") return null;
  const content = value as Partial<ContentMapContent>;
  return {
    title: typeof content.title === "string" ? content.title : "Mapa de Conteudo",
    topics: Array.isArray(content.topics)
      ? content.topics
          .map((topic): ContentMapContent["topics"][number] | null => {
            if (!topic || typeof topic !== "object") return null;
            const parsed = topic as Partial<ContentMapContent["topics"][number]>;
            if (typeof parsed.title !== "string" || parsed.title.trim().length === 0) return null;
            return {
              title: parsed.title,
              subtopics: Array.isArray(parsed.subtopics)
                ? parsed.subtopics.filter((subtopic): subtopic is string => typeof subtopic === "string")
                : [],
              sourceChunkIds: Array.isArray(parsed.sourceChunkIds)
                ? parsed.sourceChunkIds.filter((id): id is number => typeof id === "number")
                : [],
              section: parsed.section,
              isComplement: Boolean(parsed.isComplement),
            };
          })
          .filter((topic): topic is ContentMapContent["topics"][number] => topic !== null)
      : [],
    notFoundInMaterial: Boolean(content.notFoundInMaterial),
  };
}

function asFlashcardContent(value: unknown): FlashcardContent | null {
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

function asQuestionContent(value: unknown): QuestionContent | null {
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

export default function ExportPdfScreen() {
  const colors = useColors();
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const docId = Number.parseInt(documentId || "0", 10);

  const { data: doc } = trpc.documents.get.useQuery({ id: docId }, { enabled: docId > 0 });
  const { data: artifactRows } = trpc.artifacts.list.useQuery({ documentId: docId }, { enabled: docId > 0 });
  const [isExporting, setIsExporting] = useState(false);

  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeMap, setIncludeMap] = useState(true);
  const [includeFlashcards, setIncludeFlashcards] = useState(true);
  const [includeQuestions, setIncludeQuestions] = useState(true);

  const artifacts = useMemo(() => (artifactRows ?? []) as ArtifactRecord[], [artifactRows]);

  const summary = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "summary")
        .map((artifact) => asSummaryContent(artifact.content))
        .filter((content): content is SummaryContent => content !== null),
    [artifacts],
  );
  const contentMap = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "content_map")
        .map((artifact) => asContentMap(artifact.content))
        .find((content) => content !== null) ?? null,
    [artifacts],
  );
  const flashcards = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "flashcard")
        .map((artifact) => asFlashcardContent(artifact.content))
        .filter((content): content is FlashcardContent => content !== null),
    [artifacts],
  );
  const questions = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.type === "question")
        .map((artifact) => asQuestionContent(artifact.content))
        .filter((content): content is QuestionContent => content !== null),
    [artifacts],
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let html = `<!doctype html><html><head><meta charset="utf-8"><style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#333;line-height:1.6;}
        h1{color:#6C5CE7;border-bottom:2px solid #6C5CE7;padding-bottom:8px;}
        h2{color:#444;margin-top:32px;}
        .card{background:#f8f9fa;border-radius:8px;padding:16px;margin:8px 0;border-left:3px solid #6C5CE7;}
        .flashcard{display:flex;gap:16px;margin:8px 0;}
        .flashcard .front{flex:1;background:#e8f4fd;padding:12px;border-radius:8px;font-weight:600;}
        .flashcard .back{flex:1;background:#f0f8e8;padding:12px;border-radius:8px;}
        .question{margin:16px 0;padding:16px;background:#f8f9fa;border-radius:8px;}
        .option{padding:6px 12px;margin:4px 0;border-radius:4px;}
        .correct{background:#d4edda;font-weight:600;}
        .justification{margin-top:8px;padding:8px;background:#e8f4fd;border-radius:4px;font-size:.9em;}
        .topic{margin:12px 0;padding:12px;background:#f8f9fa;border-radius:8px;}
        .subtopic{margin-left:16px;padding:4px 0;}
        .footer{margin-top:40px;text-align:center;color:#999;font-size:.8em;}
        .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.8em;font-weight:600;}
        .complement{background:#fff3cd;color:#856404;}
      </style></head><body>`;

      html += `<h1>${doc?.title || "Documento"}</h1>`;
      html += `<p style="color:#666;">Gerado pelo Nota10 em ${new Date().toLocaleDateString("pt-BR")}</p>`;

      if (includeSummary && summary.length > 0) {
        html += "<h2>Resumo</h2>";
        for (const item of summary) {
          html += `<div class="card">`;
          if (item.isComplement) {
            html += `<span class="badge complement">Complemento</span> `;
          }
          html += `${item.text}</div>`;
        }
      }

      if (includeMap && contentMap) {
        html += "<h2>Mapa de Conteudo</h2>";
        html += `<h3>${contentMap.title}</h3>`;
        for (const topic of contentMap.topics) {
          html += `<div class="topic"><strong>${topic.title}</strong>`;
          for (const subtopic of topic.subtopics) {
            html += `<div class="subtopic">- ${subtopic}</div>`;
          }
          html += `</div>`;
        }
      }

      if (includeFlashcards && flashcards.length > 0) {
        html += `<h2>Flashcards (${flashcards.length})</h2>`;
        for (const card of flashcards) {
          html += `<div class="flashcard"><div class="front">${card.front}</div><div class="back">${card.back}</div></div>`;
        }
      }

      if (includeQuestions && questions.length > 0) {
        html += `<h2>Questoes (${questions.length})</h2>`;
        questions.forEach((question, index) => {
          html += `<div class="question"><strong>Questao ${index + 1}:</strong> ${question.question}`;
          for (const option of question.options) {
            const isCorrect = option === question.correctAnswer;
            html += `<div class="option ${isCorrect ? "correct" : ""}">${option}</div>`;
          }
          html += `<div class="justification"><strong>Justificativa:</strong> ${question.justification}</div>`;
          html += `</div>`;
        });
      }

      html += `<div class="footer">Gerado pelo Nota10 - estude com inteligencia</div>`;
      html += "</body></html>";

      const safeTitle = doc?.title?.replace(/[^a-zA-Z0-9]/g, "_") || "export";
      const fileName = `nota10_${safeTitle}.html`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });

      if (Platform.OS !== "web") {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, { mimeType: "text/html", dialogTitle: "Exportar Material" });
        } else {
          Alert.alert("Exportado", `Arquivo salvo em: ${fileUri}`);
        }
      } else {
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
        Alert.alert("Exportado", "Download iniciado.");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel exportar o documento.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-row items-center mb-4 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Exportar</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="text-base text-muted mb-4">
          Selecione o que deseja incluir no documento exportado:
        </Text>

        <ToggleOption
          title="Resumo"
          subtitle={`${summary.length} ponto(s)`}
          icon="doc.fill"
          enabled={includeSummary}
          onToggle={() => setIncludeSummary((current) => !current)}
          colors={colors}
        />
        <ToggleOption
          title="Mapa de Conteudo"
          subtitle={contentMap ? "1 mapa" : "Nao disponivel"}
          icon="map.fill"
          enabled={includeMap && Boolean(contentMap)}
          onToggle={() => setIncludeMap((current) => !current)}
          colors={colors}
        />
        <ToggleOption
          title="Flashcards"
          subtitle={`${flashcards.length} card(s)`}
          icon="bolt.fill"
          enabled={includeFlashcards}
          onToggle={() => setIncludeFlashcards((current) => !current)}
          colors={colors}
        />
        <ToggleOption
          title="Questoes"
          subtitle={`${questions.length} questao(oes)`}
          icon="questionmark.circle.fill"
          enabled={includeQuestions}
          onToggle={() => setIncludeQuestions((current) => !current)}
          colors={colors}
        />

        <Pressable
          onPress={handleExport}
          disabled={isExporting}
          style={({ pressed }) => [
            styles.exportBtn,
            {
              backgroundColor: colors.primary,
              opacity: isExporting ? 0.6 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          {isExporting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <IconSymbol name="doc.fill" size={22} color={colors.background} />
              <Text className="text-background font-bold text-lg ml-2">Exportar Documento</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function ToggleOption({
  title,
  subtitle,
  icon,
  enabled,
  onToggle,
  colors,
}: {
  title: string;
  subtitle: string;
  icon: Parameters<typeof IconSymbol>[0]["name"];
  enabled: boolean;
  onToggle: () => void;
  colors: ThemeColorPalette;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.toggleCard,
        {
          backgroundColor: colors.surface,
          borderColor: enabled ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <IconSymbol name={icon} size={22} color={enabled ? colors.primary : colors.muted} />
      <View className="flex-1 ml-3">
        <Text
          style={{ color: enabled ? colors.foreground : colors.muted }}
          className="text-base font-medium"
        >
          {title}
        </Text>
        <Text className="text-sm text-muted">{subtitle}</Text>
      </View>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: enabled ? colors.primary : colors.border,
            backgroundColor: enabled ? colors.primary : "transparent",
          },
        ]}
      >
        {enabled && <IconSymbol name="checkmark" size={14} color={colors.background} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 50,
    marginTop: 16,
  },
});
