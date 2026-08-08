import { NextRequest, NextResponse } from "next/server";
import {
  classifyComunRelataAccuracy,
  encryptComunRelataLocation,
} from "@/lib/comun-relata-evidence";
import {
  associateComunRelataCollective,
  COMUN_RELATA_EVIDENCE_NO_STORE,
  getComunRelataEvidenceRuntime,
  postgresBytea,
  readComunRelataEvidenceState,
} from "@/lib/comun-relata-evidence-runtime";
import { isComunRelataCollectiveEnabled } from "@/lib/comun-relata-evidence-feature";

export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json(
    { code: "location_unavailable" },
    { status: 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}

export async function POST(request: NextRequest) {
  const local = getComunRelataEvidenceRuntime(request, "location");
  if (!local) return unavailable();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { code: "invalid_location" },
      { status: 400, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  }
  const longitude = Number(body.longitude);
  const latitude = Number(body.latitude);
  const accuracyMeters =
    body.accuracyMeters === null || body.accuracyMeters === undefined
      ? null
      : Number(body.accuracyMeters);
  if (body.origin !== "device" && body.origin !== "map_pin")
    return NextResponse.json(
      { code: "invalid_location" },
      { status: 400, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  const origin = body.origin;
  const capturedAt =
    typeof body.capturedAt === "string" ? new Date(body.capturedAt) : new Date();
  try {
    const encrypted = encryptComunRelataLocation(
      { longitude, latitude, accuracyMeters },
      local.proof.protocol,
    );
    const { data, error } = await local.db.rpc("comun_relata_add_location", {
      p_protocol: local.proof.protocol,
      p_receipt_secret: local.proof.receiptSecret,
      p_origin: origin,
      p_accuracy_class: classifyComunRelataAccuracy(accuracyMeters),
      p_captured_at: capturedAt.toISOString(),
      p_ciphertext: postgresBytea(encrypted.ciphertext),
      p_nonce: postgresBytea(encrypted.nonce),
      p_auth_tag: postgresBytea(encrypted.authTag),
      p_key_version: encrypted.keyVersion,
      p_approximate_region: null,
      p_approximation_level: "none",
      p_geographic_risk: "unreviewed",
    });
    if (error || !Array.isArray(data) || !data[0]) return unavailable();
    if (isComunRelataCollectiveEnabled()) {
      await associateComunRelataCollective(local.db, local.proof, {
        longitude,
        latitude,
      });
    }
    const evidence = await readComunRelataEvidenceState(local.db, local.proof);
    return NextResponse.json(
      { evidence, noOfficialSend: true, nothingPublished: true },
      { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { code: "invalid_location" },
      { status: 400, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const local = getComunRelataEvidenceRuntime(request, "location");
  if (!local) return unavailable();
  const { data, error } = await local.db.rpc("comun_relata_withdraw_location", {
    p_protocol: local.proof.protocol,
    p_receipt_secret: local.proof.receiptSecret,
  });
  if (error || data !== true) return unavailable();
  const evidence = await readComunRelataEvidenceState(local.db, local.proof);
  return NextResponse.json(
    { evidence, noOfficialSend: true, nothingPublished: true },
    { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}
