export const PAUTA_DRAFT_KEY = "comun:pauta-low-friction-draft:v1";
export const PAUTA_DRAFT_REVISION_KEY = "comun:pauta-low-friction-revision:v1";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readPautaSessionDraft(getStorage: () => DraftStorage) {
  try {
    return { available: true, text: (getStorage().getItem(PAUTA_DRAFT_KEY) ?? "").slice(0, 500) };
  } catch {
    return { available: false, text: "" };
  }
}

export function writePautaSessionDraft(getStorage: () => DraftStorage, text: string) {
  try {
    const storage = getStorage();
    if (text) {
      // Invalidate an older receipt before touching the current text.
      storage.removeItem(PAUTA_DRAFT_REVISION_KEY);
      storage.setItem(PAUTA_DRAFT_KEY, text.slice(0, 500));
      storage.setItem(PAUTA_DRAFT_REVISION_KEY, crypto.randomUUID());
    } else {
      storage.removeItem(PAUTA_DRAFT_REVISION_KEY);
      storage.removeItem(PAUTA_DRAFT_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function readPautaDraftRevision(getStorage: () => DraftStorage) {
  try {
    return getStorage().getItem(PAUTA_DRAFT_REVISION_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPautaDraftRevision(getStorage: () => DraftStorage, revision: string) {
  if (!revision) return false;
  try {
    const storage = getStorage();
    if (storage.getItem(PAUTA_DRAFT_REVISION_KEY) !== revision) return false;
    storage.removeItem(PAUTA_DRAFT_REVISION_KEY);
    storage.removeItem(PAUTA_DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}
