export type FolderLike = {
  id: number;
};

export function resolveTargetFolderId<TFolder extends FolderLike>(
  selectedFolderId: number | null,
  folders: TFolder[] | undefined,
) {
  if (!folders || folders.length === 0) return null;
  if (selectedFolderId && folders.some((folder) => folder.id === selectedFolderId)) {
    return selectedFolderId;
  }
  return folders[0]?.id ?? null;
}
