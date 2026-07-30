export type RadioUploadValidation =
  | { ok: true }
  | {
      ok: false;
      marker:
        | "RADIO_AUDIO_MIME_BLOCKED"
        | "RADIO_AUDIO_SIZE_BLOCKED"
        | "RADIO_AUDIO_DURATION_BLOCKED"
        | "RADIO_AUDIO_CHANNELS_BLOCKED"
        | "RADIO_AUDIO_OUTPUT_SIZE_BLOCKED";
      message: string;
    };

export declare const RADIO_V1_MEDIA_PROFILE: Readonly<{
  profileId: string;
  maxUploadBytes: number;
  maxDurationSeconds: number;
  maxChannels: number;
  publicBitrateKbps: number;
  allowedOriginalMimeTypes: string[];
  privateBucket: {
    id: string;
    public: boolean;
    fileSizeLimit: number;
    allowedMimeTypes: string[];
  };
  publicBucket: {
    id: string;
    public: boolean;
    fileSizeLimit: number;
    allowedMimeTypes: string[];
  };
}>;

export function validateRadioUploadMetadata(input: {
  mimeType: string;
  sizeBytes: number;
}): RadioUploadValidation;

export function validateProcessedRadioAudio(input: {
  durationSeconds: number;
  channels: number;
  outputBytes?: number;
}): RadioUploadValidation;

export function radioProcessingPublicError(marker: string): string;

export function estimatePublicMp3Bytes(durationSeconds: number): number;
