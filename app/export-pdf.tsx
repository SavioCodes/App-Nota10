import { Text, View, Pressable, ScrollView, ActivityIndicator, Alert, Share, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { StyleSheet } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export default function ExportPdfScreen() {
  const colors = useColors();
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const docId = parseInt(documentId || "0", 10);

  const { data: doc } = trpc.documents.get.useQuery({ id: docId });
  const { data: artifacts } = trpc.artifacts.list.useQuery({ documentId: docId });
  const [isExporting, setIsExporting] = useState(false);

  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeMap, setIncludeMap] = useState(true);
  const [includeFlashcards, setIncludeFlashcards] = useState(true);
  const [includeQuestions, setIncludeQuestions] = useState(true);

  const summary = useMemo(() => artifacts?.filter(a => a.type === "summary") || [], [artifacts]);
  const contentMap = useMemo(() => artifacts?.find(a => a.type === "content_map"), [artifacts]);
  const flashcards = useMemo(() => artifacts?.filter(a => a.type === "flashcard") || [], [artifacts]);
  const questions = useMemo(() => artifacts?.filter(a => a.type === "question") || [], [artifacts]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Build HTML content for PDF
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
        h1 { color: #6C5CE7; border-bottom: 2px solid #6C5CE7; padding-bottom: 8px; }
        h2 { color: #444; margin-top: 32px; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 8px 0; border-left: 3px solid #6C5CE7; }
        .flashcard { display: flex; gap: 16px; margin: 8px 0; }
        .flashcard .front { flex: 1; background: #e8f4fd; padding: 12px; border-radius: 8px; font-weight: 600; }
        .flashcard .back { flex: 1; background: #f0f8e8; padding: 12px; border-radius: 8px; }
        .question { margin: 16px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; }
        .option { padding: 6px 12px; margin: 4px 0; border-radius: 4px; }
        .correct { background: #d4edda; font-weight: 600; }
        .justification { margin-top: 8px; padding: 8px; background: #e8f4fd; border-radius: 4px; font-size: 0.9em; }
        .topic { margin: 12px 0; padding: 12px; background: #f8f9fa; border-radius: 8px; }
        .subtopic { margin-left: 16px; padding: 4px 0; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 0.8em; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: 600; }
        .complement { background: #fff3cd; color: #856404; }
      </style></head><body>`;

      html += `<h1>${doc?.title || "Documento"}</h1>`;
      html += `<p style="color: #666;">Gerado pelo Nota10 em ${new Date().toLocaleDateString("pt-BR")}</p>`;

      // Summary
      if (includeSummary && summary.length > 0) {
        html += `<h2>📝 Resumo</h2>`;
        for (const item of summary) {
          const content = item.content as any;
          html += `<div class="card">`;
          if (content.isComplement) html += `<span class="badge complement">Complemento</span> `;
          html += `${content.text}</div>`;
        }
      }

      // Content Map
      if (includeMap && contentMap) {
        const mapContent = contentMap.content as any;
        html += `<h2>🗺️ Mapa de Conteúdo</h2>`;
        html += `<h3>${mapContent.title}</h3>`;
        for (const topic of (mapContent.topics || [])) {
          html += `<div class="topic"><strong>${topic.title}</strong>`;
          for (const sub of (topic.subtopics || [])) {
            html += `<div class="subtopic">• ${sub}</div>`;
          }
          html += `</div>`;
        }
      }

      // Flashcards
      if (includeFlashcards && flashcards.length > 0) {
        html += `<h2>🃏 Flashcards (${flashcards.length})</h2>`;
        for (const item of flashcards) {
          const content = item.content as any;
          html += `<div class="flashcard">
            <div class="front">❓ ${content.front}</div>
            <div class="back">✅ ${content.back}</div>
          </div>`;
        }
      }

      // Questions
      if (includeQuestions && questions.length > 0) {
        html += `<h2>📋 Questões (${questions.length})</h2>`;
        questions.forEach((item, i) => {
          const content = item.content as any;
          html += `<div class="question">
            <strong>Questão ${i + 1}:</strong> ${content.question}`;
          for (const opt of (content.options || [])) {
            const isCorrect = opt === content.correctAnswer;
            html += `<div class="option ${isCorrect ? "correct" : ""}">${opt}</div>`;
          }
          html += `<div class="justification"><strong>Justificativa:</strong> ${content.justification}</div>`;
          html += `</div>`;
        });
      }

      html += `<div class="footer">Gerado pelo Nota10 — Estude com inteligência</div>`;
      html += `</body></html>`;

      // Save HTML file (on mobile, we'd use a print-to-PDF library)
      const fileName = `nota10_${doc?.title?.replace(/[^a-zA-Z0-9]/g, "_") || "export"}.html`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });

      // Share the file
      if (Platform.OS !== "web") {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, { mimeType: "text/html", dialogTitle: "Exportar Material" });
        } else {
          Alert.alert("Exportado", `Arquivo salvo em: ${fileUri}`);
        }
      } else {
        // Web: download
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert("Exportado", "Download iniciado!");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível exportar o documento.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-4" edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center mb-4 gap-3">
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Exportar</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="text-base text-muted mb-4">Selecione o que deseja incluir no documento exportado:</Text>

        {/* Toggle Options */}
        <ToggleOption
          title="Resumo"
          subtitle={`${summary.length} ponto(s)`}
          icon="doc.fill"
          enabled={includeSummary}
          onToggle={() => setIncludeSummary(!includeSummary)}
          colors={colors}
        />
        <ToggleOption
          title="Mapa de Conteúdo"
          subtitle={contentMap ? "1 mapa" : "Não disponível"}
          icon="map.fill"
          enabled={includeMap && !!contentMap}
          onToggle={() => setIncludeMap(!includeMap)}
          colors={colors}
        />
        <ToggleOption
          title="Flashcards"
          subtitle={`${flashcards.length} card(s)`}
          icon="bolt.fill"
          enabled={includeFlashcards}
          onToggle={() => setIncludeFlashcards(!includeFlashcards)}
          colors={colors}
        />
        <ToggleOption
          title="Questões"
          subtitle={`${questions.length} questão(ões)`}
          icon="questionmark.circle.fill"
          enabled={includeQuestions}
          onToggle={() => setIncludeQuestions(!includeQuestions)}
          colors={colors}
        />

        {/* Export Button */}
        <Pressable
          onPress={handleExport}
          disabled={isExporting}
          style={({ pressed }) => [styles.exportBtn, { backgroundColor: colors.primary, opacity: isExporting ? 0.6 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
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

function ToggleOption({ title, subtitle, icon, enabled, onToggle, colors }: {
  title: string; subtitle: string; icon: any; enabled: boolean; onToggle: () => void; colors: any;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.toggleCard, { backgroundColor: colors.surface, borderColor: enabled ? colors.primary : colors.border, opacity: pressed ? 0.8 : 1 }]}
    >
      <IconSymbol name={icon} size={22} color={enabled ? colors.primary : colors.muted} />
      <View className="flex-1 ml-3">
        <Text style={{ color: enabled ? colors.foreground : colors.muted }} className="text-base font-medium">{title}</Text>
        <Text className="text-sm text-muted">{subtitle}</Text>
      </View>
      <View style={[styles.checkbox, { borderColor: enabled ? colors.primary : colors.border, backgroundColor: enabled ? colors.primary : "transparent" }]}>
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
