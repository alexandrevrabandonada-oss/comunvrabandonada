import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { MediaStorageProvider } from "@/lib/media-storage/types";
import {
  RADIO_V1_MEDIA_PROFILE,
  validateProcessedRadioAudio,
  validateRadioUploadMetadata,
} from "./radio-media-profile.mjs";

const magic: Record<string, (body: Buffer) => boolean> = {
  "audio/wav": (body) =>
    body.subarray(0, 4).toString() === "RIFF" &&
    body.subarray(8, 12).toString() === "WAVE",
  "audio/mpeg": (body) =>
    body.subarray(0, 3).toString() === "ID3" ||
    (body[0] === 0xff && (body[1] & 0xe0) === 0xe0),
  "audio/mp4": (body) => body.subarray(4, 8).toString() === "ftyp",
  "audio/ogg": (body) => body.subarray(0, 4).toString() === "OggS",
  "audio/flac": (body) => body.subarray(0, 4).toString() === "fLaC",
};

export function ffmpegAvailable() {
  return (
    spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0 &&
    spawnSync("ffprobe", ["-version"], { stdio: "ignore" }).status === 0
  );
}

export async function inspectRadioAudio(
  body: Uint8Array,
  mime: string,
  filename: string,
) {
  const metadataValidation = validateRadioUploadMetadata({
    mimeType: mime,
    sizeBytes: body.byteLength,
  });
  if (
    !metadataValidation.ok ||
    !magic[mime]?.(Buffer.from(body)) ||
    !/\.(wav|mp3|m4a|ogg|flac)$/i.test(filename)
  ) {
    throw new Error("RADIO_AUDIO_INVALID");
  }
  if (!ffmpegAvailable()) throw new Error("FFMPEG_UNAVAILABLE");
  const directory = await mkdtemp(path.join(tmpdir(), "comun-radio-"));
  const input = path.join(directory, `input.${filename.split(".").pop()}`);
  try {
    await writeFile(input, body);
    const probe = spawnSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,channels,sample_rate",
        "-of",
        "json",
        input,
      ],
      { encoding: "utf8" },
    );
    if (probe.status !== 0) throw new Error("RADIO_AUDIO_PROBE_FAILED");
    const parsed = JSON.parse(probe.stdout);
    const audio =
      parsed.streams?.filter(
        (stream: { codec_type?: string }) => stream.codec_type === "audio",
      ) ?? [];
    const measuredDuration = Number(parsed.format?.duration);
    const channels = Number(audio[0]?.channels);
    const processedValidation = validateProcessedRadioAudio({
      durationSeconds: measuredDuration,
      channels,
    });
    if (audio.length !== 1 || !processedValidation.ok) {
      throw new Error("RADIO_AUDIO_LIMITS");
    }
    return {
      duration: Math.round(measuredDuration),
      channels,
      sampleRate: Number(audio[0].sample_rate),
      checksum: crypto.createHash("sha256").update(body).digest("hex"),
      size: body.byteLength,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function processRadioAudio(input: {
  episodeId: string;
  originalKey: string;
  mime: string;
  filename: string;
  provider: MediaStorageProvider;
}) {
  const body = await input.provider.readObject(
    "radio_private_original",
    input.originalKey,
  );
  const meta = await inspectRadioAudio(body, input.mime, input.filename);
  const directory = await mkdtemp(path.join(tmpdir(), "comun-radio-"));
  const source = path.join(
    directory,
    `source.${input.filename.split(".").pop()}`,
  );
  const mp3 = path.join(directory, "episode.mp3");
  const pcm = path.join(directory, "wave.raw");
  try {
    await writeFile(source, body);
    const encode = spawnSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      source,
      "-map_metadata",
      "-1",
      "-af",
      "loudnorm=I=-16:TP=-1.5:LRA=11",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      `${RADIO_V1_MEDIA_PROFILE.publicBitrateKbps}k`,
      mp3,
    ]);
    if (encode.status !== 0) throw new Error("RADIO_AUDIO_PROCESSING_FAILED");
    const waveform = spawnSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      source,
      "-ac",
      "1",
      "-ar",
      "8000",
      "-f",
      "s16le",
      pcm,
    ]);
    if (waveform.status !== 0) throw new Error("RADIO_AUDIO_PROCESSING_FAILED");
    const audio = await readFile(mp3);
    const outputValidation = validateProcessedRadioAudio({
      durationSeconds: meta.duration,
      channels: meta.channels,
      outputBytes: audio.byteLength,
    });
    if (!outputValidation.ok) throw new Error("RADIO_AUDIO_OUTPUT_LIMIT");
    const raw = await readFile(pcm);
    const samples = new Int16Array(
      raw.buffer,
      raw.byteOffset,
      Math.floor(raw.byteLength / 2),
    );
    const step = Math.max(1, Math.floor(samples.length / 800));
    const peaks = [];
    for (let index = 0; index < samples.length; index += step) {
      let maximum = 0;
      for (
        let cursor = index;
        cursor < Math.min(samples.length, index + step);
        cursor += 1
      ) {
        maximum = Math.max(maximum, Math.abs(samples[cursor]));
      }
      peaks.push(Math.round(maximum / 327.67) / 100);
    }
    const audioKey = `radio-public/${input.episodeId}/episode.mp3`;
    const waveformKey = `radio-public/${input.episodeId}/waveform.json`;
    const waveformBody = Buffer.from(
      JSON.stringify({ version: 1, duration: meta.duration, peaks }),
    );
    await input.provider
      .removeObject("radio_public", audioKey)
      .catch(() => undefined);
    await input.provider
      .removeObject("radio_public", waveformKey)
      .catch(() => undefined);
    await input.provider.writeDerivative({
      scope: "radio_public",
      key: audioKey,
      contentType: "audio/mpeg",
      sizeBytes: audio.byteLength,
      body: audio,
    });
    await input.provider.writeDerivative({
      scope: "radio_public",
      key: waveformKey,
      contentType: "application/json",
      sizeBytes: waveformBody.byteLength,
      body: waveformBody,
    });
    return {
      meta,
      audio: {
        key: audioKey,
        url: input.provider.createPublicDerivativeUrl(audioKey),
        size: audio.byteLength,
        checksum: crypto.createHash("sha256").update(audio).digest("hex"),
      },
      waveform: {
        key: waveformKey,
        url: input.provider.createPublicDerivativeUrl(waveformKey),
        size: waveformBody.byteLength,
        points: peaks.length,
      },
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
