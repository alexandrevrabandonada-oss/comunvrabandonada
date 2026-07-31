import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { ComunAdminSession } from "@/lib/admin-auth";

type AuditMetadata = Record<string, unknown>;

const SENSITIVE_KEYS = new Set([
  "raw_text",
  "private_contact",
  "internal_notes",
  "password",
  "token",
  "storage_path",
  "signed_url",
  "signedUrl",
  "object_key",
  "objectKey",
  "email",
  "private_notes",
  "private_contact",
  "term",
  "binary",
  "secret",
]);

function isSensitiveAuditKey(key: string) {
  const normalized = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  return (
    SENSITIVE_KEYS.has(key) ||
    SENSITIVE_KEYS.has(normalized) ||
    /(?:^|_)(?:email|token|secret|password|cookie|session|contact|object_key|storage_path|signed_url|private|exact|latitude|longitude|geometry)(?:_|$)/.test(
      normalized,
    )
  );
}

export function sanitizeAuditMetadata(metadata: AuditMetadata = {}) {
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.slice(0, 50).map(clean);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value as AuditMetadata)
          .filter(([key]) => !isSensitiveAuditKey(key))
          .map(([key, item]) => [key, clean(item)]),
      );
    if (typeof value === "string") {
      if (/https?:\/\/[^\s?]+\?[^\s]*(token|signature|x-amz)/i.test(value))
        return "[redacted-url]";
      return value.slice(0, 300);
    }
    return value;
  };
  return clean(metadata) as AuditMetadata;
}

export async function logComunAdminAction(input: {
  session?: ComunAdminSession | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: AuditMetadata;
}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return;

  await supabase.from("comun_admin_audit_log").insert({
    admin_user_id: input.session?.admin.id ?? null,
    admin_email:
      input.session?.admin.email ?? input.session?.user.email ?? null,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: sanitizeAuditMetadata(input.metadata),
  });
}

export async function listComunAdminAuditLog(limit = 100) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("comun_admin_audit_log")
    .select(
      "id, admin_email, action, target_type, target_id, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function listComunAdminAuditLogSanitized(limit = 20) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("comun_admin_audit_log")
    .select("id, action, target_type, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
