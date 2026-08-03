import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { COMUN_RELATA_MAX_PHOTO_BYTES } from "@/lib/comun-relata-evidence";
import {
  COMUN_RELATA_EVIDENCE_NO_STORE,
  getComunRelataEvidenceRuntime,
  readComunRelataEvidenceState,
} from "@/lib/comun-relata-evidence-runtime";

export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json(
    { code: "attachments_unavailable" },
    { status: 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}
export async function GET(request: NextRequest) {
  const local = getComunRelataEvidenceRuntime(request);
  if (!local) return unavailable();
  const evidence = await readComunRelataEvidenceState(local.db, local.proof);
  if (!evidence) return unavailable();
  return NextResponse.json(
    { photos: evidence.photos, noOfficialSend: true, nothingPublished: true },
    { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}

export async function POST(request: NextRequest) {
  const local = getComunRelataEvidenceRuntime(request);
  if (!local) return unavailable();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { code: "invalid_photo" },
      { status: 400, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  }
  const declaredMimeType = String(body.mimeType ?? "");
  const declaredSizeBytes = Number(body.sizeBytes);
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(declaredMimeType) ||
    !Number.isInteger(declaredSizeBytes) ||
    declaredSizeBytes < 12 ||
    declaredSizeBytes > COMUN_RELATA_MAX_PHOTO_BYTES
  )
    return NextResponse.json(
      { code: "invalid_photo" },
      { status: 400, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  const attachmentId = randomUUID();
  const sizeBucket =
    declaredSizeBytes < 1024 * 1024
      ? "under_1mb"
      : declaredSizeBytes <= 4 * 1024 * 1024
        ? "1_to_4mb"
        : "4_to_8mb";
  const { data, error } = await local.db.rpc("comun_relata_begin_attachment", {
    p_protocol: local.proof.protocol,
    p_receipt_secret: local.proof.receiptSecret,
    p_attachment_id: attachmentId,
    p_declared_mime_type: declaredMimeType,
    p_declared_size_bucket: sizeBucket,
  });
  if (error || !Array.isArray(data) || !data[0]) {
    const limit = error?.message?.includes("ATTACHMENT_LIMIT");
    return NextResponse.json(
      { code: limit ? "photo_limit" : "attachments_unavailable" },
      { status: limit ? 409 : 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  }
  const started = data[0] as {
    label_index: number;
    attachment_state: string;
  };
  return NextResponse.json(
    {
      upload: {
        label: `Foto ${started.label_index}`,
        state: started.attachment_state,
        url: `/api/comun/relata/evidence/attachments/${attachmentId}`,
        method: "PUT",
      },
      noOfficialSend: true,
      nothingPublished: true,
    },
    { status: 201, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}
