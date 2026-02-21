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
import { buildExportHtml } from "./html-builder";
import {
  asContentMap,
  asFlashcardContent,
  asQuestionContent,
  asSummaryContent,
  type ArtifactRecord,
} from "./parsers";

export default function ExportScreen() {
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
      const html = buildExportHtml({
        title: doc?.title || "Documento",
        generatedAt: new Date(),
        includeSummary,
        includeMap,
        includeFlashcards,
        includeQuestions,
        summary,
        contentMap: contentMap as ContentMapContent | null,
        flashcards,
        questions,
      });

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
