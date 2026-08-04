import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isComunSidewalkRelataForwardingEnabled } from "@/lib/comun-sidewalk-relata-feature";
import { createComunRelataPersistenceClient } from "@/lib/comun-relata-persistence";
import { readWalletToken, walletSecretHash } from "@/lib/comun-participation-wallet-runtime";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
function dormant() { return NextResponse.json({ code: "not_found" }, { status: 404, headers }); }
function bodyObject(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function possessionProof(recordId: string, tokenHash: string) { return createHash("sha256").update(`sidewalk-possession-v1:${recordId}:${tokenHash}`).digest("hex"); }

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isComunSidewalkRelataForwardingEnabled()) return dormant();
  const token = readWalletToken(request); const path = (await context.params).path;
  if (!token || path[0] !== "links" || !path[1]) return dormant();
  try {
    const { data, error } = await createComunRelataPersistenceClient().rpc("comun_sidewalk_relata_status", { p_token_hash_hex: walletSecretHash(token), p_link_id: path[1] });
    if (error || !Array.isArray(data) || !data[0]) return dormant();
    return NextResponse.json({ relation: data[0] }, { headers });
  } catch { return dormant(); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isComunSidewalkRelataForwardingEnabled()) return dormant();
  const token = readWalletToken(request); const path = (await context.params).path;
  if (!token) return dormant();
  let body: Record<string, unknown>; try { body = bodyObject(await request.json()); } catch { body = {}; }
  const db = createComunRelataPersistenceClient(); const tokenHash = walletSecretHash(token);
  try {
    if (path[0] === "records" && path[1] === "create-relata") {
      const recordId = typeof body.recordId === "string" ? body.recordId : "";
      const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : `sidewalk-${recordId}`;
      const receiptSecret = typeof body.receiptSecret === "string" ? body.receiptSecret : "";
      const text = typeof body.text === "string" ? body.text : "";
      const { data, error } = await db.rpc("comun_sidewalk_relata_create", {
        p_token_hash_hex: tokenHash, p_record_id: recordId, p_possession_proof_hex: possessionProof(recordId, tokenHash),
        p_idempotency_key: idempotencyKey, p_receipt_secret: receiptSecret, p_original_text: text,
        p_urgency: typeof body.urgency === "string" ? body.urgency : "attention", p_consent_version: "sidewalk-relata-v1",
      });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return NextResponse.json({ relation: data[0] }, { status: 201, headers });
    }
    if (path[0] === "links" && path[1] === "candidate") {
      const caseId = typeof body.caseId === "string" ? body.caseId : "";
      const { data, error } = await db.rpc("comun_sidewalk_relata_candidate", { p_token_hash_hex: tokenHash, p_case_id: caseId, p_consent: body.consent === true });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return NextResponse.json({ relation: data[0] }, { status: 201, headers });
    }
    if (path[0] === "links" && path[2] === "jurisdiction") {
      const jurisdiction = typeof body.jurisdiction === "string" ? body.jurisdiction : "unknown";
      const { data, error } = await db.rpc("comun_sidewalk_jurisdiction_set", { p_token_hash_hex: tokenHash, p_link_id: path[1], p_jurisdiction: jurisdiction, p_note: typeof body.note === "string" ? body.note : null });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return NextResponse.json({ relation: data[0] }, { headers });
    }
    if (path[0] === "links" && path[2] === "forwarding") {
      const { data, error } = await db.rpc("comun_sidewalk_forwarding_prepare", { p_token_hash_hex: tokenHash, p_link_id: path[1] });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return NextResponse.json({ package: data[0] }, { status: 201, headers });
    }
    return dormant();
  } catch { return NextResponse.json({ code: "sidewalk_relata_unavailable" }, { status: 503, headers }); }
}

export async function PUT() { return dormant(); }
export async function PATCH() { return dormant(); }
export async function DELETE() { return dormant(); }
