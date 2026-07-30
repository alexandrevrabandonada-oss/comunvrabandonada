import { describe, expect, it } from "vitest";
import {
  estimatePublicMp3Bytes,
  RADIO_V1_MEDIA_PROFILE,
  radioProcessingPublicError,
  validateProcessedRadioAudio,
  validateRadioUploadMetadata,
} from "@/lib/radio-media-profile.mjs";

describe("perfil gratuito da Rádio V1", () => {
  it("mantém um contrato único de 45 MiB, 30 minutos, dois canais e 160 kbps", () => {
    expect(RADIO_V1_MEDIA_PROFILE.maxUploadBytes).toBe(47_185_920);
    expect(RADIO_V1_MEDIA_PROFILE.maxDurationSeconds).toBe(1_800);
    expect(RADIO_V1_MEDIA_PROFILE.maxChannels).toBe(2);
    expect(RADIO_V1_MEDIA_PROFILE.publicBitrateKbps).toBe(160);
    expect(RADIO_V1_MEDIA_PROFILE.privateBucket.fileSizeLimit).toBe(47_185_920);
    expect(RADIO_V1_MEDIA_PROFILE.publicBucket.fileSizeLimit).toBe(47_185_920);
  });

  it("bloqueia o original acima de 45 MiB antes do upload", () => {
    expect(
      validateRadioUploadMetadata({
        mimeType: "audio/mpeg",
        sizeBytes: 47_185_921,
      }),
    ).toMatchObject({ ok: false, marker: "RADIO_AUDIO_SIZE_BLOCKED" });
  });

  it("aceita o limite exato e rejeita MIME fora da allowlist", () => {
    expect(
      validateRadioUploadMetadata({
        mimeType: "audio/flac",
        sizeBytes: 47_185_920,
      }),
    ).toEqual({ ok: true });
    expect(
      validateRadioUploadMetadata({
        mimeType: "audio/webm",
        sizeBytes: 1_000,
      }),
    ).toMatchObject({ ok: false, marker: "RADIO_AUDIO_MIME_BLOCKED" });
  });

  it("bloqueia duração, canais e derivada fora do perfil", () => {
    expect(
      validateProcessedRadioAudio({ durationSeconds: 1_800, channels: 1 }),
    ).toEqual({ ok: true });
    expect(
      validateProcessedRadioAudio({ durationSeconds: 1_800, channels: 2 }),
    ).toEqual({ ok: true });
    expect(
      validateProcessedRadioAudio({ durationSeconds: 1_801, channels: 2 }),
    ).toMatchObject({ ok: false, marker: "RADIO_AUDIO_DURATION_BLOCKED" });
    expect(
      validateProcessedRadioAudio({ durationSeconds: 1_800, channels: 3 }),
    ).toMatchObject({ ok: false, marker: "RADIO_AUDIO_CHANNELS_BLOCKED" });
    expect(
      validateProcessedRadioAudio({
        durationSeconds: 1_800,
        channels: 2,
        outputBytes: 47_185_921,
      }),
    ).toMatchObject({ ok: false, marker: "RADIO_AUDIO_OUTPUT_SIZE_BLOCKED" });
  });

  it("converte falhas internas em mensagens públicas compreensíveis", () => {
    expect(radioProcessingPublicError("RADIO_AUDIO_INVALID")).toContain(
      "corrompido",
    );
    expect(radioProcessingPublicError("FFMPEG_UNAVAILABLE")).toContain(
      "temporariamente indisponível",
    );
    expect(radioProcessingPublicError("erro-interno-desconhecido")).not.toMatch(
      /path|ffmpeg|stack|spawn/i,
    );
  });

  it("a estimativa máxima em 160 kbps fica abaixo de 45 MiB", () => {
    expect(estimatePublicMp3Bytes(1_800)).toBe(36_000_000);
    expect(estimatePublicMp3Bytes(1_800)).toBeLessThan(
      RADIO_V1_MEDIA_PROFILE.publicBucket.fileSizeLimit,
    );
  });
});
