import profile from "../config/radio-v1-media-profile.json" with { type: "json" };

export const RADIO_V1_MEDIA_PROFILE = Object.freeze(profile);

export function validateRadioUploadMetadata({ mimeType, sizeBytes }) {
  if (!RADIO_V1_MEDIA_PROFILE.allowedOriginalMimeTypes.includes(mimeType)) {
    return {
      ok: false,
      marker: "RADIO_AUDIO_MIME_BLOCKED",
      message: "Use WAV, MP3, M4A, Ogg ou FLAC.",
    };
  }
  if (
    !Number.isFinite(sizeBytes) ||
    sizeBytes < 1 ||
    sizeBytes > RADIO_V1_MEDIA_PROFILE.maxUploadBytes
  ) {
    return {
      ok: false,
      marker: "RADIO_AUDIO_SIZE_BLOCKED",
      message:
        "O áudio deve ter no máximo 45 MiB. Divida programas longos em partes editoriais.",
    };
  }
  return { ok: true };
}

export function validateProcessedRadioAudio({
  durationSeconds,
  channels,
  outputBytes,
}) {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 1 ||
    durationSeconds > RADIO_V1_MEDIA_PROFILE.maxDurationSeconds
  ) {
    return {
      ok: false,
      marker: "RADIO_AUDIO_DURATION_BLOCKED",
      message:
        "O áudio deve ter no máximo 30 minutos. Divida conteúdos longos em partes editoriais.",
    };
  }
  if (
    !Number.isInteger(channels) ||
    channels < 1 ||
    channels > RADIO_V1_MEDIA_PROFILE.maxChannels
  ) {
    return {
      ok: false,
      marker: "RADIO_AUDIO_CHANNELS_BLOCKED",
      message: "O áudio deve ser mono ou estéreo, com no máximo dois canais.",
    };
  }
  if (
    outputBytes !== undefined &&
    outputBytes > RADIO_V1_MEDIA_PROFILE.publicBucket.fileSizeLimit
  ) {
    return {
      ok: false,
      marker: "RADIO_AUDIO_OUTPUT_SIZE_BLOCKED",
      message:
        "A versão pública ultrapassaria 45 MiB. Divida o conteúdo em partes editoriais.",
    };
  }
  return { ok: true };
}

export function radioProcessingPublicError(marker) {
  const messages = {
    RADIO_AUDIO_INVALID:
      "O arquivo não corresponde ao formato informado ou está corrompido.",
    RADIO_AUDIO_PROBE_FAILED:
      "Não foi possível ler a estrutura do áudio. Verifique o arquivo e tente novamente.",
    RADIO_AUDIO_LIMITS:
      "O áudio deve ter até 30 minutos e no máximo dois canais.",
    RADIO_AUDIO_OUTPUT_LIMIT:
      "A versão pública ultrapassaria 45 MiB. Divida o conteúdo em partes editoriais.",
    FFMPEG_UNAVAILABLE:
      "O processamento de áudio está temporariamente indisponível.",
    RADIO_AUDIO_PROCESSING_FAILED:
      "O processamento de áudio está temporariamente indisponível.",
  };
  return (
    messages[marker] ??
    "Não foi possível processar o áudio. O original privado foi preservado."
  );
}

export function estimatePublicMp3Bytes(durationSeconds) {
  return Math.ceil(
    (durationSeconds * RADIO_V1_MEDIA_PROFILE.publicBitrateKbps * 1000) / 8,
  );
}
