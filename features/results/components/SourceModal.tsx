import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ThemeColorPalette } from "@/constants/theme";

type ChunkRecord = {
  id: number;
  chunkOrder: number;
  textContent: string;
};

export function SourceModal({
  visible,
  chunkIds,
  chunks,
  colors,
  onClose,
}: {
  visible: boolean;
  chunkIds: number[];
  chunks: ChunkRecord[];
  colors: ThemeColorPalette;
  onClose: () => void;
}) {
  const chunkData = chunkIds.length === 0 ? [] : chunks.filter((chunk) => chunkIds.includes(chunk.id));

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">Fonte no Material</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {chunkData.map((chunk) => (
              <View
                key={chunk.id}
                style={[
                  styles.chunkBlock,
                  { backgroundColor: colors.surface, borderColor: `${colors.primary}40` },
                ]}
              >
                <Text className="text-xs font-bold text-primary mb-1">Trecho #{chunk.chunkOrder + 1}</Text>
                <Text className="text-sm text-foreground leading-5">{chunk.textContent}</Text>
              </View>
            ))}
            {chunkData.length === 0 && (
              <Text className="text-base text-muted text-center py-8">Nenhuma fonte encontrada</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
