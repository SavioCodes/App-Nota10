import { useCallback, useEffect, useMemo, useState } from "react";

import { getPreferredFolderId, setPreferredFolderId } from "@/lib/_core/preferred-folder";

export type TargetFolder = {
  id: number;
  name: string;
};

type UseTargetFolderOptions = {
  forcedFolderId?: number | null;
};

export function useTargetFolder<TFolder extends TargetFolder>(
  folders: TFolder[] | undefined,
  options?: UseTargetFolderOptions,
) {
  const forcedFolderId = options?.forcedFolderId ?? null;
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(forcedFolderId);

  useEffect(() => {
    if (!folders || folders.length === 0) {
      setSelectedFolderId(null);
      return;
    }

    if (forcedFolderId && folders.some((folder) => folder.id === forcedFolderId)) {
      setSelectedFolderId(forcedFolderId);
      return;
    }

    if (selectedFolderId && folders.some((folder) => folder.id === selectedFolderId)) {
      return;
    }

    let mounted = true;
    void (async () => {
      const preferredFolderId = await getPreferredFolderId();
      const fallbackFolderId = folders[0]?.id ?? null;
      const resolvedFolderId =
        preferredFolderId && folders.some((folder) => folder.id === preferredFolderId)
          ? preferredFolderId
          : fallbackFolderId;

      if (mounted) {
        setSelectedFolderId(resolvedFolderId);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [folders, forcedFolderId, selectedFolderId]);

  const selectedFolder = useMemo(
    () => folders?.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  const targetFolderId = selectedFolderId ?? folders?.[0]?.id ?? null;

  const selectFolder = useCallback((folderId: number) => {
    setSelectedFolderId(folderId);
    void setPreferredFolderId(folderId);
  }, []);

  const persistFolderPreference = useCallback(async (folderId: number | null) => {
    if (!folderId) return;
    await setPreferredFolderId(folderId);
  }, []);

  return {
    selectedFolderId,
    selectedFolder,
    targetFolderId,
    selectFolder,
    persistFolderPreference,
  };
}
