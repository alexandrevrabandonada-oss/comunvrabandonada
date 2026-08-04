import { NextRequest, NextResponse } from "next/server";
import { isComunForwardingEnabled } from "@/lib/comun-forwarding-feature";
import {
  forwardingDb,
  safePackage,
  walletHash,
} from "@/lib/comun-forwarding-runtime";
import { readWalletToken } from "@/lib/comun-participation-wallet-runtime";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store, max-age=0" };
function dormant() {
  return NextResponse.json({ code: "not_found" }, { status: 404, headers });
}
function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers });
}

async function requestBody(request: NextRequest) {
  try {
    const value = await request.json();
    return safePackage(value);
  } catch {
    return {};
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!isComunForwardingEnabled()) return dormant();
  const token = readWalletToken(request);
  if (!token) return dormant();
  const path = (await context.params).path;
  if (path[0] !== "packages") return dormant();
  try {
    const { data, error } = await forwardingDb().rpc(
      "comun_forwarding_package_list",
      { p_token_hash_hex: walletHash(token) },
    );
    if (error) return dormant();
    const packages = Array.isArray(data) ? data : [];
    if (!path[1]) return json({ packages });
    const found = packages.find((item) => item.package_id === path[1]);
    return found ? json({ package: found }) : dormant();
  } catch {
    return dormant();
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!isComunForwardingEnabled()) return dormant();
  const token = readWalletToken(request);
  if (!token) return dormant();
  const path = (await context.params).path;
  const body = await requestBody(request);
  const db = forwardingDb();
  try {
    if (path[0] === "packages" && path.length === 1) {
      const relataCaseId =
        typeof body.relataCaseId === "string" ? body.relataCaseId : "";
      const adapterId =
        typeof body.adapterId === "string"
          ? body.adapterId
          : "vr-fiscaliza-lighting-v1";
      const { data, error } = await db.rpc("comun_forwarding_package_create", {
        p_token_hash_hex: walletHash(token),
        p_relata_case_id: relataCaseId,
        p_adapter_id: adapterId,
      });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return json({ package: data[0] }, 201);
    }
    const packageId = path[1];
    if (!packageId) return dormant();
    if (path[2] === "opened") {
      const { data, error } = await db.rpc("comun_forwarding_opened", {
        p_token_hash_hex: walletHash(token),
        p_package_id: packageId,
      });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return json({ opened: true, package: data[0] });
    }
    if (path[2] === "review") {
      const institutionalText =
        typeof body.institutionalText === "string"
          ? body.institutionalText
          : "";
      const { data, error } = await db.rpc("comun_forwarding_review", {
        p_token_hash_hex: walletHash(token),
        p_package_id: packageId,
        p_institutional_text: institutionalText,
      });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return json({ package: data[0] });
    }
    if (path[2] === "declare-sent") {
      const result = typeof body.result === "string" ? body.result : "";
      const { data, error } = await db.rpc("comun_forwarding_declare_sent", {
        p_token_hash_hex: walletHash(token),
        p_package_id: packageId,
        p_result: result,
      });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return json({ package: data[0] });
    }
    if (path[2] === "official-protocol") {
      const protocol = typeof body.protocol === "string" ? body.protocol : "";
      const { data, error } = await db.rpc(
        "comun_forwarding_record_official_protocol",
        {
          p_token_hash_hex: walletHash(token),
          p_package_id: packageId,
          p_protocol: protocol,
        },
      );
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return json({ package: data[0] });
    }
    if (path[2] === "response") {
      const note = typeof body.note === "string" ? body.note : "";
      const state =
        typeof body.state === "string" ? body.state : "response_recorded";
      const { data, error } = await db.rpc("comun_forwarding_record_response", {
        p_token_hash_hex: walletHash(token),
        p_package_id: packageId,
        p_note: note,
        p_state: state,
      });
      if (error || !Array.isArray(data) || !data[0]) return dormant();
      return json({ package: data[0] });
    }
    if (path[2] === "withdraw") {
      const { data, error } = await db.rpc("comun_forwarding_withdraw", {
        p_token_hash_hex: walletHash(token),
        p_package_id: packageId,
      });
      if (error || !(data === true || data?.[0] === true)) return dormant();
      return json({ withdrawn: true });
    }
    return dormant();
  } catch {
    return json({ code: "forwarding_unavailable" }, 503);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!isComunForwardingEnabled()) return dormant();
  const token = readWalletToken(request);
  const path = (await context.params).path;
  if (
    !token ||
    path[0] !== "packages" ||
    path.length !== 3 ||
    path[2] !== "requirements" ||
    !path[1]
  )
    return dormant();
  const body = await requestBody(request);
  try {
    const { data, error } = await forwardingDb().rpc(
      "comun_forwarding_requirements_update",
      {
        p_token_hash_hex: walletHash(token),
        p_package_id: path[1],
        p_location_reference:
          typeof body.locationReference === "string"
            ? body.locationReference
            : null,
        p_contact: typeof body.contact === "string" ? body.contact : null,
        p_confirm_text: body.confirmText === true,
      },
    );
    if (error || !Array.isArray(data) || !data[0]) return dormant();
    return json({ package: data[0] });
  } catch {
    return dormant();
  }
}

export async function PUT() {
  return dormant();
}
export async function DELETE() {
  return dormant();
}
