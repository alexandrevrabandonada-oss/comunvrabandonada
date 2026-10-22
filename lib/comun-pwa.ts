export const COMUN_DRAFT_KEY = "comun:drafts:v2";
export const COMUN_LAST_SAFE_ROUTE_KEY = "comun:last-safe-route:v1";
export const COMUN_INSTALL_DISMISS_KEY = "comun:install-dismissed:v1";

type OptionalStorageReader = Pick<Storage, "getItem">;
type OptionalStorageWriter = Pick<Storage, "setItem">;
type OptionalStorageRemover = Pick<Storage, "removeItem">;

/** Browser storage is optional: accessors and methods may throw SecurityError. */
export function readComunOptionalStorage(
  resolve: () => OptionalStorageReader,
  key: string,
): { available: boolean; value: string | null } {
  try {
    return { available: true, value: resolve().getItem(key) };
  } catch {
    return { available: false, value: null };
  }
}

export function writeComunOptionalStorage(
  resolve: () => OptionalStorageWriter,
  key: string,
  value: string,
): boolean {
  try {
    resolve().setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeComunOptionalStorage(
  resolve: () => OptionalStorageRemover,
  key: string,
): boolean {
  try {
    resolve().removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export type SafeDraft = {
  id: string;
  kind: "sidewalk";
  step: number;
  category: string;
  territory?: string;
  community?: string;
  pauta?: string;
  manualMap: boolean;
  updatedAt: string;
  schemaVersion: 2;
};

export const COMUN_PUBLIC_OFFLINE_PREFIXES = [
  "/comun/territorios",
  "/comun/comunidades",
  "/comun/c/",
  "/comun/pautas",
  "/comun/acoes",
  "/comun/resultados",
  "/comun/dossies",
  "/comun/radio",
  "/comun/arte",
  "/comun/acervo",
  "/comun/observatorios",
  "/comun/seguranca",
  "/comun/ajuda",
] as const;

export function isSafeComunRoute(path: string) {
  let url: URL;
  try {
    url = new URL(path, "https://comun.invalid");
  } catch {
    return false;
  }
  if (url.origin !== "https://comun.invalid" || url.search || url.hash)
    return false;
  if (
    url.pathname.startsWith("/comun/c/") &&
    !/^\/comun\/c\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/agenda)?\/?$/.test(url.pathname)
  )
    return false;
  return COMUN_PUBLIC_OFFLINE_PREFIXES.some(
    (prefix) =>
      url.pathname === prefix.replace(/\/$/, "") ||
      url.pathname.startsWith(prefix),
  );
}

export function parseSafeDrafts(raw: string | null): SafeDraft[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SafeDraft =>
      Boolean(
        item &&
          typeof item === "object" &&
          (item as SafeDraft).schemaVersion === 2 &&
          (item as SafeDraft).kind === "sidewalk" &&
          typeof (item as SafeDraft).id === "string" &&
          typeof (item as SafeDraft).step === "number" &&
          typeof (item as SafeDraft).category === "string" &&
          typeof (item as SafeDraft).manualMap === "boolean" &&
          typeof (item as SafeDraft).updatedAt === "string",
      ),
    );
  } catch {
    return [];
  }
}

export function migrateSidewalkDraft(
  raw: string | null,
  pauta = "calcadas-em-circulacao",
): SafeDraft[] {
  if (!raw) return [];
  try {
    const old = JSON.parse(raw) as {
      step?: number;
      category?: string;
      manualMap?: boolean;
    };
    return [
      {
        id: `sidewalk:${pauta}`,
        kind: "sidewalk",
        step: Math.min(4, Math.max(1, old.step || 1)),
        category: old.category || "calcada_irregular",
        pauta,
        manualMap: old.manualMap !== false,
        updatedAt: new Date().toISOString(),
        schemaVersion: 2,
      },
    ];
  } catch {
    return [];
  }
}
