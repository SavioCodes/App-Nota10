import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function LibraryScreen() {
  const { isAuthenticated } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { data: folders, refetch } = trpc.folders.list.useQuery(undefined, { enabled: isAuthenticated });
  const createFolder = trpc.folders.create.useMutation({ onSuccess: () => { refetch(); setShowNewFolder(false); setNewFolderName(""); } });
  const deleteFolder = trpc.folders.delete.useMutation({ onSuccess: () => refetch() });

  const filteredFolders = folders?.filter(f => f.name.toLowerCase().includes(search.toLowerCase())) || [];

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-muted">Faça login para acessar sua biblioteca</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pt-4">
      <Text className="text-2xl font-bold text-foreground mb-4">Biblioteca</Text>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
        <TextInput
          placeholder="Buscar matéria..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="done"
        />
      </View>

      {/* New Folder Input */}
      {showNewFolder && (
        <View style={[styles.newFolderRow, { borderColor: colors.border }]}>
          <TextInput
            placeholder="Nome da matéria..."
            placeholderTextColor={colors.muted}
            value={newFolderName}
            onChangeText={setNewFolderName}
            style={[styles.newFolderInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => {
              if (newFolderName.trim()) createFolder.mutate({ name: newFolderName.trim() });
            }}
          />
          <Pressable
            onPress={() => { if (newFolderName.trim()) createFolder.mutate({ name: newFolderName.trim() }); }}
            style={({ pressed }) => [styles.createBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text className="text-background font-semibold text-sm">Criar</Text>
          </Pressable>
        </View>
      )}

      {/* Folders List */}
      <FlatList
        data={filteredFolders}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/folder/${item.id}`)}
            onLongPress={() => {
              Alert.alert("Excluir pasta", `Deseja excluir "${item.name}"?`, [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", style: "destructive", onPress: () => deleteFolder.mutate({ id: item.id }) },
              ]);
            }}
            style={({ pressed }) => [styles.folderCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.folderIcon, { backgroundColor: colors.warning + "20" }]}>
              <IconSymbol name="folder.fill" size={24} color={colors.warning} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-base font-semibold text-foreground">{item.name}</Text>
              <Text className="text-sm text-muted">Toque para ver documentos</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <IconSymbol name="folder.fill" size={48} color={colors.muted} />
            <Text className="text-base text-muted mt-3">Nenhuma pasta ainda</Text>
            <Text className="text-sm text-muted mt-1">Crie uma pasta para organizar seus materiais</Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => setShowNewFolder(!showNewFolder)}
        style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
      >
        <IconSymbol name="plus" size={28} color={colors.background} />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  newFolderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  newFolderInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  folderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
