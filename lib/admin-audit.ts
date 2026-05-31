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
]);

function sanitizeMetadata(metadata: AuditMetadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !SENSITIVE_KEYS.has(key))
      .map(([key, value]) => {
        if (typeof value === "string" && value.length > 300) return [key, `${value.slice(0, 300)}...`];
        return [key, value];
      }),
  );
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
    admin_email: input.session?.admin.email ?? input.session?.user.email ?? null,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: sanitizeMetadata(input.metadata),
  });
}

export async function listComunAdminAuditLog(limit = 100) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("comun_admin_audit_log")
    .select("id, admin_email, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
