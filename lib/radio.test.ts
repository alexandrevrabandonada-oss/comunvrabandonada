import { describe, expect, it } from "vitest";
import { radioPublicationBlockers } from "./radio";
import { inspectRadioAudio } from "./radio-audio";
import { validatePautaModuleConfig } from "./comun/pauta-module-registry";
describe("radio comunitaria", () => {
  it("falha fechada sem audio, credito, consentimento, contexto e acessibilidade", () => {
    expect(
      radioPublicationBlockers({
        title: "T",
        summary: "R",
        program: "p",
        transcriptStatus: "unavailable",
        consents: [],
      }),
    ).toEqual(
      expect.arrayContaining([
        "duration",
        "public_audio",
        "credits",
        "voice_consent",
        "context",
        "transcript_status",
      ]),
    );
  });
  it("bloqueia musica pendente e menor sem revisao", () => {
    expect(
      radioPublicationBlockers({
        title: "T",
        summary: "R",
        program: "p",
        duration: 30,
        publicAudio: true,
        credits: 1,
        consents: [{ consent_status: "approved", allow_comun_audio: true }],
        music: [{ rights_status: "pending", allow_streaming: false }],
        minor: true,
        context: true,
        transcriptStatus: "published",
      }),
    ).toEqual(["music_rights", "minor_review"]);
  });
  it("aceita excecao de transcricao apenas quando documentada", () => {
    expect(
      radioPublicationBlockers({
        title: "T",
        summary: "R",
        program: "p",
        duration: 30,
        publicAudio: true,
        credits: 1,
        consents: [{ consent_status: "approved", allow_comun_audio: true }],
        context: true,
        transcriptStatus: "unavailable",
        transcriptExceptionDocumented: true,
      }),
    ).toEqual([]);
  });
  it("aceita configuracao segura do modulo", () => {
    expect(
      validatePautaModuleConfig("community_radio", {
        programIds: [],
        episodeIds: [],
        relationTypes: [],
        territoryIds: [],
        limit: 6,
        showSchedule: true,
        contributionEnabled: true,
        showTranscript: true,
      }).success,
    ).toBe(true);
  });
  it("rejeita executavel renomeado", async () => {
    await expect(
      inspectRadioAudio(
        new Uint8Array([77, 90, 0, 0]),
        "audio/mpeg",
        "ata.mp3",
      ),
    ).rejects.toThrow("RADIO_AUDIO_INVALID");
  });
});
