"use client";

import { useState } from "react";
import {
  RADIO_V1_MEDIA_PROFILE,
  validateRadioUploadMetadata,
} from "@/lib/radio-media-profile.mjs";

export function RadioUpload({ episodeId }: { episodeId: string }) {
  const [status, setStatus] = useState("");
  const [assetId, setAssetId] = useState<string>();

  async function upload(file: File) {
    const validation = validateRadioUploadMetadata({
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (!validation.ok) {
      setAssetId(undefined);
      setStatus(validation.message);
      return;
    }
    setStatus("Validando upload privado…");
    const prepared = await fetch("/api/comun/admin/archive/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        archiveItemId: episodeId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        role: "radio_private_original",
      }),
    });
    const payload = await prepared.json();
    if (!prepared.ok) {
      setStatus(payload.error);
      return;
    }
    const sent = await fetch(payload.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!sent.ok) {
      setStatus("Falha ao enviar original.");
      return;
    }
    const confirmed = await fetch("/api/comun/admin/archive/confirm-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: payload.assetId }),
    });
    if (!confirmed.ok) {
      setStatus("Upload rejeitado na confirmação.");
      return;
    }
    setAssetId(payload.assetId);
    setStatus(
      "Original privado confirmado. Aprove consentimentos e direitos antes de processar.",
    );
  }

  async function process() {
    if (!assetId) return;
    setStatus("Processando localmente com FFmpeg…");
    const response = await fetch("/api/comun/admin/radio/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ episodeId, assetId }),
    });
    const body = await response.json();
    setStatus(
      response.ok
        ? `Derivada e waveform gerados (${body.durationSeconds}s).`
        : body.error,
    );
  }

  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <label className="font-black uppercase" htmlFor="radio-audio">
        Original privado (até 45 MiB e 30 minutos)
      </label>
      <p className="mt-2 text-sm">
        Áudios longos devem ser divididos em partes ou episódios, com título e
        numeração claros. O processamento aceita mono ou estéreo e gera MP3
        público a {RADIO_V1_MEDIA_PROFILE.publicBitrateKbps} kbps.
      </p>
      <input
        id="radio-audio"
        className="mt-3 block max-w-full"
        type="file"
        accept="audio/wav,audio/mpeg,audio/mp4,audio/ogg,audio/flac"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {assetId ? (
        <button
          type="button"
          onClick={process}
          className="mt-3 border-2 border-comun-black bg-comun-yellow p-2 font-black text-comun-black"
        >
          PROCESSAR APÓS APROVAÇÕES
        </button>
      ) : null}
      <p role="status" className="mt-2 text-sm">
        {status}
      </p>
    </div>
  );
}
