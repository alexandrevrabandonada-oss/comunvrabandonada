import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { FixtureStorageProvider } from "../lib/media-storage/fixture.ts";
import { processRadioAudio } from "../lib/radio-audio.ts";
import { archiveBucketScope } from "../lib/media-storage/scopes.ts";

// Local, synthetic audio only. No database, network or real recordings.
const provider = new FixtureStorageProvider();
const originalKey = "radio-originals/audit-synthetic/original.wav";
const body = execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"]);
await provider.putObject({ scope: "radio_private_original", key: originalKey, contentType: "audio/wav", sizeBytes: body.length, body });
assert.equal(archiveBucketScope("radio_private_original"), "private_original");
assert.equal((await provider.readObject("private_original", originalKey)).length, body.length);
const result = await processRadioAudio({ episodeId: "audit-synthetic", originalKey, mime: "audio/wav", filename: "original.wav", provider });
assert.ok(result.meta.duration > 0);
assert.ok((await provider.readObject("public_safe", result.audio.key)).length > 0);
const waveform = JSON.parse(Buffer.from(await provider.readObject("public_safe", result.waveform.key)).toString());
assert.ok(waveform.peaks.length > 0);
assert.equal(archiveBucketScope("radio_public"), "public_safe");
console.log("RADIO_STORAGE_FFMPEG_CYCLE_OK");
