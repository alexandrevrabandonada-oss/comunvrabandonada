import { NextRequest, NextResponse } from "next/server";
import {
  associateComunRelataCollective,
  COMUN_RELATA_EVIDENCE_NO_STORE,
  getComunRelataEvidenceRuntime,
  readComunRelataEvidenceState,
} from "@/lib/comun-relata-evidence-runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const local = getComunRelataEvidenceRuntime(request);
  if (!local)
    return NextResponse.json(
      { code: "grouping_unavailable" },
      { status: 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  const grouping = await associateComunRelataCollective(local.db, local.proof);
  const evidence = await readComunRelataEvidenceState(local.db, local.proof);
  if (!grouping || !evidence)
    return NextResponse.json(
      { code: "grouping_unavailable" },
      { status: 404, headers: COMUN_RELATA_EVIDENCE_NO_STORE },
    );
  return NextResponse.json(
    { evidence, noOfficialSend: true, nothingPublished: true },
    { headers: COMUN_RELATA_EVIDENCE_NO_STORE },
  );
}
