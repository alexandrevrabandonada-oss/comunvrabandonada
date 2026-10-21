import { describe, expect, it } from "vitest";
import {
  PAUTA_DRAFT_KEY,
  clearPautaDraftRevision,
  readPautaDraftRevision,
  readPautaSessionDraft,
  writePautaSessionDraft,
} from "./comun-pauta-session-draft";

describe("pauta draft continuity", () => {
  it("restores the latest edit and removes erased text instead of resurrecting it", () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        entries.set(key, value);
      },
      removeItem: (key: string) => {
        entries.delete(key);
      },
    };
    writePautaSessionDraft(() => storage, "Primeira questão");
    writePautaSessionDraft(() => storage, "Questão revisada");
    expect(readPautaSessionDraft(() => storage)).toEqual({
      available: true,
      text: "Questão revisada",
    });
    expect(entries.has(PAUTA_DRAFT_KEY)).toBe(true);
    writePautaSessionDraft(() => storage, "");
    expect(readPautaSessionDraft(() => storage).text).toBe("");
  });

  it("handles denied storage access and quota failure without throwing", () => {
    const denied = () => {
      throw new Error("SecurityError");
    };
    expect(readPautaSessionDraft(denied)).toEqual({
      available: false,
      text: "",
    });
    expect(writePautaSessionDraft(denied, "Questão")).toBe(false);
    expect(
      writePautaSessionDraft(
        () => ({ getItem: () => null, setItem: denied, removeItem: denied }),
        "Questão",
      ),
    ).toBe(false);
    expect(clearPautaDraftRevision(denied, "receipt")).toBe(false);
    expect(readPautaDraftRevision(denied)).toBe("");
  });

  it("only clears the exact submitted revision, leaving a newer draft intact", () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        entries.set(key, value);
      },
      removeItem: (key: string) => {
        entries.delete(key);
      },
    };
    writePautaSessionDraft(() => storage, "Questão enviada");
    const receipt = readPautaDraftRevision(() => storage);
    expect(clearPautaDraftRevision(() => storage, "")).toBe(false);
    writePautaSessionDraft(() => storage, "Nova preparação");
    expect(clearPautaDraftRevision(() => storage, receipt)).toBe(false);
    expect(readPautaSessionDraft(() => storage).text).toBe("Nova preparação");
    const current = readPautaDraftRevision(() => storage);
    expect(clearPautaDraftRevision(() => storage, current)).toBe(true);
    expect(readPautaSessionDraft(() => storage).text).toBe("");
  });
});
