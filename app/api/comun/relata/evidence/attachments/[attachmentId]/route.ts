import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_EVIDENCE_BUCKET,
  COMUN_RELATA_MAX_PHOTO_BYTES,
  comunRelataAttachmentPaths,
  removeComunRelataEvidenceObjects,
  validateAndDeriveComunRelataPhoto,
} from "@/lib/comun-relata-evidence";
import {
  COMUN_RELATA_EVIDENCE_NO_STORE,
  getComunRelataEvidenceRuntime,
  postgresBytea,
  readComunRelataEvidenceState,
} from "@/lib/comun-relata-evidence-runtime";

export const runtime = "nodejs";

type Context = { params: Promise<{ attachmentId: string }> };

function unavailable() {
  return NextResponse.json(
    { code: "attachment_unavailable" },
    { status: 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}

function rejectionCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("TYPE")) return "invalid_type";
  if (message.includes("SIZE")) return "size_limit";
  if (message.includes("DIMENSIONS")) return "dimension_limit";
  if (message.includes("CORRUPT")) return "corrupt_image";
  return "partial_failure";
}

async function readPhotoBody(request: NextRequest) {
  if (!request.body) throw new Error("COMUN_RELATA_PHOTO_SIZE_INVALID");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > COMUN_RELATA_MAX_PHOTO_BYTES) {
      await reader.cancel();
      throw new Error("COMUN_RELATA_PHOTO_SIZE_INVALID");
    }
    chunks.push(value);
  }
  if (total < 12) throw new Error("COMUN_RELATA_PHOTO_SIZE_INVALID");
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function PUT(request: NextRequest, context: Context) {
  const local = getComunRelataEvidenceRuntime(request, "attachments");
  if (!local) return unavailable();
  const { attachmentId } = await context.params;
  let paths: ReturnType<typeof comunRelataAttachmentPaths>;
  try {
    paths = comunRelataAttachmentPaths(attachmentId);
  } catch {
    return unavailable();
  }
  const declaredLengthHeader = request.headers.get("content-length");
  const declaredLength = Number(declaredLengthHeader);
  if (
    declaredLengthHeader !== null &&
    Number.isFinite(declaredLength) &&
    (declaredLength < 12 || declaredLength > COMUN_RELATA_MAX_PHOTO_BYTES)
  )
    return NextResponse.json(
      { code: "invalid_photo" },
      { status: 413, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  const validating = await local.db.rpc(
    "comun_relata_mark_attachment_validating",
    {
      p_protocol: local.proof.protocol,
      p_receipt_secret: local.proof.receiptSecret,
      p_attachment_id: attachmentId,
    },
  );
  if (
    validating.error ||
    !Array.isArray(validating.data) ||
    !validating.data[0]
  )
    return unavailable();

  try {
    const body = await readPhotoBody(request);
    const photo = await validateAndDeriveComunRelataPhoto(body);
    if (photo.mimeType !== validating.data[0].declared_mime_type)
      throw new Error("COMUN_RELATA_PHOTO_TYPE_INVALID");
    const originalUpload = await local.db.storage
      .from(COMUN_RELATA_EVIDENCE_BUCKET)
      .upload(paths.original, body, {
        contentType: photo.mimeType,
        cacheControl: "0",
        upsert: false,
      });
    if (originalUpload.error) throw new Error("COMUN_RELATA_STORAGE_FAILURE");
    const derivativeUpload = await local.db.storage
      .from(COMUN_RELATA_EVIDENCE_BUCKET)
      .upload(paths.derivative, photo.derivative, {
        contentType: "image/webp",
        cacheControl: "0",
        upsert: false,
      });
    if (derivativeUpload.error) throw new Error("COMUN_RELATA_STORAGE_FAILURE");
    const finalized = await local.db.rpc("comun_relata_finalize_attachment", {
      p_protocol: local.proof.protocol,
      p_receipt_secret: local.proof.receiptSecret,
      p_attachment_id: attachmentId,
      p_actual_mime_type: photo.mimeType,
      p_actual_size_bytes: photo.originalSizeBytes,
      p_derivative_size_bytes: photo.derivative.byteLength,
      p_width: photo.width,
      p_height: photo.height,
      p_checksum_sha256: postgresBytea(photo.checksum),
      p_derivative_checksum_sha256: postgresBytea(photo.derivativeChecksum),
    });
    if (finalized.error || !Array.isArray(finalized.data) || !finalized.data[0])
      throw new Error("COMUN_RELATA_FINALIZATION_FAILURE");
    if (finalized.data[0].attachment_state === "rejected")
      await removeComunRelataEvidenceObjects(local.db, attachmentId);
    const evidence = await readComunRelataEvidenceState(local.db, local.proof);
    return NextResponse.json(
      { evidence, noOfficialSend: true, nothingPublished: true },
      { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  } catch (error) {
    await removeComunRelataEvidenceObjects(local.db, attachmentId).catch(
      () => undefined,
    );
    await local.db.rpc("comun_relata_reject_attachment", {
      p_protocol: local.proof.protocol,
      p_receipt_secret: local.proof.receiptSecret,
      p_attachment_id: attachmentId,
      p_rejection_code: rejectionCode(error),
    });
    return NextResponse.json(
      { code: "invalid_photo" },
      { status: 400, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  }
}

/** Finalizes a direct signed upload without sending the image bytes through Next/Vercel. */
export async function POST(request: NextRequest, context: Context) {
  const local = getComunRelataEvidenceRuntime(request, "attachments");
  if (!local) return unavailable();
  const { attachmentId } = await context.params;
  let paths: ReturnType<typeof comunRelataAttachmentPaths>;
  try {
    paths = comunRelataAttachmentPaths(attachmentId);
  } catch {
    return unavailable();
  }
  const validating = await local.db.rpc("comun_relata_mark_attachment_validating", {
    p_protocol: local.proof.protocol,
    p_receipt_secret: local.proof.receiptSecret,
    p_attachment_id: attachmentId,
  });
  if (validating.error || !Array.isArray(validating.data) || !validating.data[0]) return unavailable();
  try {
    const downloaded = await local.db.storage.from(COMUN_RELATA_EVIDENCE_BUCKET).download(paths.original);
    if (downloaded.error || !downloaded.data) throw new Error("COMUN_RELATA_STORAGE_FAILURE");
    const body = new Uint8Array(await downloaded.data.arrayBuffer());
    const photo = await validateAndDeriveComunRelataPhoto(body);
    if (photo.mimeType !== validating.data[0].declared_mime_type) throw new Error("COMUN_RELATA_PHOTO_TYPE_INVALID");
    const derivativeUpload = await local.db.storage.from(COMUN_RELATA_EVIDENCE_BUCKET).upload(paths.derivative, photo.derivative, {
      contentType: "image/webp",
      cacheControl: "0",
      upsert: false,
    });
    if (derivativeUpload.error) throw new Error("COMUN_RELATA_STORAGE_FAILURE");
    const finalized = await local.db.rpc("comun_relata_finalize_attachment", {
      p_protocol: local.proof.protocol,
      p_receipt_secret: local.proof.receiptSecret,
      p_attachment_id: attachmentId,
      p_actual_mime_type: photo.mimeType,
      p_actual_size_bytes: photo.originalSizeBytes,
      p_derivative_size_bytes: photo.derivative.byteLength,
      p_width: photo.width,
      p_height: photo.height,
      p_checksum_sha256: postgresBytea(photo.checksum),
      p_derivative_checksum_sha256: postgresBytea(photo.derivativeChecksum),
    });
    if (finalized.error || !Array.isArray(finalized.data) || !finalized.data[0]) throw new Error("COMUN_RELATA_FINALIZATION_FAILURE");
    if (finalized.data[0].attachment_state === "rejected") await removeComunRelataEvidenceObjects(local.db, attachmentId);
    await local.db.storage.from(COMUN_RELATA_EVIDENCE_BUCKET).remove([paths.original]);
    const evidence = await readComunRelataEvidenceState(local.db, local.proof);
    return NextResponse.json({ evidence, noOfficialSend: true, nothingPublished: true }, { headers: COMUN_RELATA_EVIDENCE_NO_STORE });
  } catch (error) {
    await removeComunRelataEvidenceObjects(local.db, attachmentId).catch(() => undefined);
    await local.db.rpc("comun_relata_reject_attachment", {
      p_protocol: local.proof.protocol,
      p_receipt_secret: local.proof.receiptSecret,
      p_attachment_id: attachmentId,
      p_rejection_code: rejectionCode(error),
    });
    return NextResponse.json({ code: "invalid_photo" }, { status: 400, headers: COMUN_RELATA_EVIDENCE_NO_STORE });
  }
}

export async function GET(request: NextRequest, context: Context) {
  const local = getComunRelataEvidenceRuntime(request, "attachments");
  if (!local) return unavailable();
  const { attachmentId } = await context.params;
  let paths: ReturnType<typeof comunRelataAttachmentPaths>;
  try {
    paths = comunRelataAttachmentPaths(attachmentId);
  } catch {
    return unavailable();
  }
  const authorization = await local.db.rpc(
    "comun_relata_authorize_attachment_read",
    {
      p_protocol: local.proof.protocol,
      p_receipt_secret: local.proof.receiptSecret,
      p_attachment_id: attachmentId,
    },
  );
  if (
    authorization.error ||
    !Array.isArray(authorization.data) ||
    !authorization.data[0]
  )
    return unavailable();
  const downloaded = await local.db.storage
    .from(COMUN_RELATA_EVIDENCE_BUCKET)
    .download(paths.derivative);
  if (downloaded.error || !downloaded.data) return unavailable();
  const label = Number(authorization.data[0].label_index) || 1;
  return new NextResponse(await downloaded.data.arrayBuffer(), {
    headers: {
      ...COMUN_RELATA_EVIDENCE_NO_STORE,
      "content-type": "image/webp",
      "content-disposition": `inline; filename="Foto-${label}.webp"`,
    },
  });
}

export async function DELETE(request: NextRequest, context: Context) {
  const local = getComunRelataEvidenceRuntime(request, "attachments");
  if (!local) return unavailable();
  const { attachmentId } = await context.params;
  try {
    comunRelataAttachmentPaths(attachmentId);
  } catch {
    return unavailable();
  }
  const withdrawn = await local.db.rpc("comun_relata_withdraw_attachment", {
    p_protocol: local.proof.protocol,
    p_receipt_secret: local.proof.receiptSecret,
    p_attachment_id: attachmentId,
  });
  if (withdrawn.error || withdrawn.data !== true) return unavailable();
  const evidence = await readComunRelataEvidenceState(local.db, local.proof);
  return NextResponse.json(
    { evidence, noOfficialSend: true, nothingPublished: true },
    { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}
