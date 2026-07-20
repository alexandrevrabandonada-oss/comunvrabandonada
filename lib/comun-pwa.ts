export const COMUN_DRAFT_KEY = "comun:drafts:v2";
export const COMUN_LAST_SAFE_ROUTE_KEY = "comun:last-safe-route:v1";
export const COMUN_INSTALL_DISMISS_KEY = "comun:install-dismissed:v1";

export type SafeDraft = {
  id: string; kind: "sidewalk"; step: number; category: string; territory?: string;
  community?: string; pauta?: string; manualMap: boolean; updatedAt: string; schemaVersion: 2;
};

export function isSafeComunRoute(path: string) {
  return /^\/comun(?:\/|$)/.test(path) && !/^\/comun\/(?:admin|entrar|criar-conta|conta|caixa-de-entrada)(?:\/|$)/.test(path);
}

export function parseSafeDrafts(raw: string | null): SafeDraft[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SafeDraft => Boolean(item && typeof item === "object" &&
      (item as SafeDraft).schemaVersion === 2 && (item as SafeDraft).kind === "sidewalk" &&
      typeof (item as SafeDraft).id === "string" && typeof (item as SafeDraft).step === "number" &&
      typeof (item as SafeDraft).category === "string" && typeof (item as SafeDraft).manualMap === "boolean" &&
      typeof (item as SafeDraft).updatedAt === "string"));
  } catch { return []; }
}

export function migrateSidewalkDraft(raw: string | null, pauta = "calcadas-em-circulacao"): SafeDraft[] {
  if (!raw) return [];
  try {
    const old = JSON.parse(raw) as { step?: number; category?: string; manualMap?: boolean };
    return [{ id: `sidewalk:${pauta}`, kind: "sidewalk", step: Math.min(4, Math.max(1, old.step || 1)),
      category: old.category || "calcada_irregular", pauta, manualMap: old.manualMap !== false,
      updatedAt: new Date().toISOString(), schemaVersion: 2 }];
  } catch { return []; }
}
