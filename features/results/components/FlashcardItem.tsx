import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ThemeColorPalette } from "@/constants/theme";

export function FlashcardItem({
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
  sourceBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 4,
  },
});
