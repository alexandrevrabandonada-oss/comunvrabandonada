import { NextRequest, NextResponse } from "next/server";
import {
  createPublicSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const NO_STORE = {
  "cache-control": "private, no-store, max-age=0",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

const EXPECTED_RPCS = [
  "comun_relata_begin_attachment",
  "comun_relata_mark_attachment_validating",
  "comun_relata_finalize_attachment",
  "comun_relata_reject_attachment",
  "comun_relata_authorize_attachment_read",
  "comun_relata_withdraw_attachment",
] as const;

function notFound() {
  return new NextResponse(null, { status: 404, headers: NO_STORE });
}

function isStagedProductionRequest(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const deploymentHost = process.env.VERCEL_URL?.toLowerCase() ?? "";
  const canonicalHosts = new Set([
    "comunsocial.online",
    "www.comunsocial.online",
    "comunvrabandonada.vercel.app",
    "comunvrabandonada-alexandrevrabandonada-oss-projects.vercel.app",
  ]);

  return (
    process.env.VERCEL_ENV === "production" &&
    Boolean(host && deploymentHost && host === deploymentHost) &&
    !canonicalHosts.has(host)
  );
}

async function readRpcSurface(
  url: string,
  serviceRole: string,
): Promise<{ expected: number; observed: number }> {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: serviceRole,
      authorization: `Bearer ${serviceRole}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return { expected: EXPECTED_RPCS.length, observed: 0 };
  const openApi = (await response.json()) as { paths?: Record<string, unknown> };
  const paths = openApi.paths ?? {};
  const observed = EXPECTED_RPCS.filter((name) => `/rpc/${name}` in paths).length;
  return { expected: EXPECTED_RPCS.length, observed };
}

async function readServiceRoleProbe(
  db: NonNullable<ReturnType<typeof createServiceSupabaseClient>>,
) {
  const { data, error } = await db.rpc("comun_relata_get_receipt", {
    p_protocol: "COMUN-RELATA-0000000000000000",
    p_receipt_secret: "p3a-preflight-invalid-receipt",
  });
  return !error && Array.isArray(data) && data.length === 0;
}

async function readAnonPrivateAccess() {
  const anon = createPublicSupabaseClient();
  if (!anon) return false;
  const probes = await Promise.all([
    anon.schema("private").from("comun_relata_reports").select("id").limit(1),
    anon.schema("private").from("comun_relata_attachments").select("id").limit(1),
  ]);
  return probes.every(({ data, error }) => Boolean(error) && !data);
}

export async function GET(request: NextRequest) {
  if (!isStagedProductionRequest(request)) return notFound();

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRole || !url) return notFound();

  const db = createServiceSupabaseClient();
  if (!db) return notFound();

  const { data: bucket, error: bucketError } = await db.storage.getBucket(
    "comun-relata-private",
  );
  const rpcSurface = await readRpcSurface(url, serviceRole);
  const serviceRoleReadProbe = await readServiceRoleProbe(db);
  const anonPrivateReadBlocked = await readAnonPrivateAccess();

  const result =
    !bucketError &&
    Boolean(bucket) &&
    bucket.public === false &&
    rpcSurface.observed === rpcSurface.expected &&
    serviceRoleReadProbe &&
    anonPrivateReadBlocked
      ? "COMUN_P3A_REMOTE_ATTACHMENT_PREFLIGHT_GREEN"
      : "COMUN_P3A_REMOTE_ATTACHMENT_PREFLIGHT_BLOCKED";

  return NextResponse.json(
    {
      result,
      bucket: { exists: !bucketError && Boolean(bucket), public: bucket?.public ?? null },
      rpcs: {
        expected: rpcSurface.expected,
        observed: rpcSurface.observed,
        serviceRoleReadProbe,
      },
      access: {
        anonPrivateReadBlocked,
        authenticatedGrantBaseline: "r2a_remote_exact_unchanged",
        serviceRoleServerOnly: true,
      },
      schema: { newMigration: false, remoteDryRun: "empty" },
    },
    { headers: NO_STORE },
  );
}
