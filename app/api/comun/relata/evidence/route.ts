import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_RELATA_EVIDENCE_NO_STORE,
  getComunRelataEvidenceRuntime,
  readComunRelataEvidenceState,
} from "@/lib/comun-relata-evidence-runtime";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const local = getComunRelataEvidenceRuntime(request);
  if (!local)
    return NextResponse.json(
      { code: "not_found" },
      { status: 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  const evidence = await readComunRelataEvidenceState(local.db, local.proof);
  if (!evidence)
    return NextResponse.json(
      { code: "evidence_unavailable" },
      { status: 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  return NextResponse.json(
    { evidence, noOfficialSend: true, nothingPublished: true },
    { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}
