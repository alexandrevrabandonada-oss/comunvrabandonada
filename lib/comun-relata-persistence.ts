import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RelataStatus } from "./comun-relata-contract";

export const COMUN_RELATA_PERSISTENCE_FLAG =
  "COMUN_RELATA_LOCAL_PERSISTENCE" as const;
export const COMUN_RELATA_RECEIPT_COOKIE = "comun_relata_receipt_v1" as const;

export type ComunRelataReceipt = {
  protocol: string;
  state: RelataStatus;
  category: string;
  urgency: string;
  ruleVersion: string;
  createdAt: string;
  withdrawnAt: string | null;
  timeline: Array<{
    state: RelataStatus;
    occurredAt: string;
    resultCode: string;
  }>;
};

export function isLoopbackSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      Boolean(url.port)
    );
  } catch {
    return false;
  }
}

export function isComunRelataPersistenceEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.COMUN_RELATA_PREVIEW === "enabled" &&
    env[COMUN_RELATA_PERSISTENCE_FLAG] === "enabled" &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function createComunRelataPersistenceClient(
  env: Record<string, string | undefined> = process.env,
): SupabaseClient {
  if (!isComunRelataPersistenceEnabled(env)) {
    throw new Error("COMUN_RELATA_LOCAL_RUNTIME_REQUIRED");
  }
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-comun-scope": "relata-local-48-0b" } },
    },
  );
}

export function encodeComunRelataReceiptCookie(
  protocol: string,
  receiptSecret: string,
) {
  return Buffer.from(
    JSON.stringify({ protocol, receiptSecret }),
    "utf8",
  ).toString("base64url");
}

export function decodeComunRelataReceiptCookie(value: string | undefined) {
  if (!value || value.length > 512) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (
      typeof parsed.protocol !== "string" ||
      !/^COMUN-RELATA-[A-F0-9]{16}$/.test(parsed.protocol) ||
      typeof parsed.receiptSecret !== "string" ||
      !/^[A-Za-z0-9_-]{32,160}$/.test(parsed.receiptSecret)
    )
      return null;
    return {
      protocol: parsed.protocol,
      receiptSecret: parsed.receiptSecret,
    };
  } catch {
    return null;
  }
}

type RpcReceipt = {
  protocol: string;
  state: RelataStatus;
  category: string;
  urgency: string;
  rule_version: string;
  created_at: string;
  withdrawn_at?: string | null;
  timeline?: Array<{
    state: RelataStatus;
    occurredAt: string;
    resultCode: string;
  }>;
};

export function normalizeComunRelataReceipt(
  value: RpcReceipt,
): ComunRelataReceipt {
  return {
    protocol: value.protocol,
    state: value.state,
    category: value.category,
    urgency: value.urgency,
    ruleVersion: value.rule_version,
    createdAt: value.created_at,
    withdrawnAt: value.withdrawn_at ?? null,
    timeline: Array.isArray(value.timeline) ? value.timeline : [],
  };
}
