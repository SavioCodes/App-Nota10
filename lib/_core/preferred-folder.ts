import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFERRED_FOLDER_ID_KEY = "nota10_preferred_folder_id";

export async function getPreferredFolderId(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFERRED_FOLDER_ID_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function setPreferredFolderId(folderId: number): Promise<void> {
  if (!Number.isInteger(folderId) || folderId <= 0) return;
  try {
    await AsyncStorage.setItem(PREFERRED_FOLDER_ID_KEY, String(folderId));
  } catch {
    // no-op: preference persistence must not block study flow
  }
}
