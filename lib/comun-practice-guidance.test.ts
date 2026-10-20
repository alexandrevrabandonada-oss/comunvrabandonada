import { describe, expect, it } from "vitest";
import {
  guidanceStageForRecord,
  participationGuidanceHref,
  resolveParticipationGuidanceStage,
} from "./comun-practice-guidance";

describe("public practice context", () => {
  it.each(["withdrawn", "Retirado", "published", "unknown"])(
    "does not invent an active practice for %s",
    (state) => {
      expect(guidanceStageForRecord(state)).toBeNull();
    },
  );
  it.each([
    ["captured_private", "registro"],
    ["waiting_response", "acompanhamento"],
    ["responded", "devolutiva"],
  ] as const)("uses the recorded state %s", (state, stage) => {
    expect(guidanceStageForRecord(state)).toBe(stage);
  });
  it.each([
    "__proto__",
    "constructor",
    "https://evil.example",
    "registro&user_id=private",
    ["registro"],
    null,
  ])("rejects untrusted phase %s", (value) => {
    expect(resolveParticipationGuidanceStage(value)).toBeNull();
  });
  it("passes only public context and experience in links", () => {
    expect(participationGuidanceHref("acompanhamento")).toBe(
      "/comun/ajuda/primeira-acao?etapa=acompanhamento",
    );
    expect(participationGuidanceHref("acompanhamento", false)).toBe(
      "/comun/ajuda/primeira-acao?etapa=acompanhamento&experiencia=legacy",
    );
  });
});
