import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export type FolderPickerItem = {
  id: number;
  name: string;
};

type FolderPickerModalProps = {
  visible: boolean;
  folders: FolderPickerItem[] | undefined;
  selectedFolderId: number | null;
  onSelect: (folderId: number) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
};

export function FolderPickerModal({
  visible,
  folders,
  selectedFolderId,
  onSelect,
  onClose,
  title = "Selecionar pasta",
  subtitle = "Escolha onde salvar este material.",
}: FolderPickerModalProps) {
  const colors = useColors();

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text className="text-base font-semibold text-foreground">{title}</Text>
          <Text className="text-xs text-muted mt-1 mb-3">{subtitle}</Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {folders?.length ? (
              folders.map((folder) => {
                const isSelected = folder.id === selectedFolderId;
                return (
                  <Pressable
                    key={folder.id}
                    onPress={() => {
                      onSelect(folder.id);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.folderRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: isSelected ? `${colors.primary}18` : colors.background,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View style={styles.folderNameWrap}>
                      <Text className="text-sm text-foreground" numberOfLines={1}>
                        {folder.name}
                      </Text>
                    </View>
                    {isSelected ? (
                      <IconSymbol name="checkmark.circle.fill" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })
            ) : (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Text className="text-sm text-muted">Nenhuma pasta disponivel.</Text>
              </View>
            )}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text className="text-sm font-semibold text-foreground">Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    maxHeight: "75%",
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    gap: 8,
  },
  folderRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  folderNameWrap: {
    flex: 1,
    marginRight: 8,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  closeButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
});
