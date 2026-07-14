import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logComunAdminAction } from "@/lib/admin-audit";
import { hashSubmitter } from "@/lib/historical-photo";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
const schema = z.object({
  archiveItemId: z.string().uuid().optional().or(z.literal("")),
  requestType: z.enum(["correction", "credit", "removal"]),
  contact: z.string().min(3).max(300),
  reason: z.string().min(10).max(3000),
  website: z.string().max(0),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revise a solicitacao." },
      { status: 400 },
    );
  const db = createServiceSupabaseClient();
  if (!db)
    return NextResponse.json(
      { error: "Servico indisponivel." },
      { status: 503 },
    );
  const h = await headers(),
    identity = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    submitterHash = hashSubmitter(
      identity,
      process.env.COMUN_LOOKUP_HASH_SALT || "local-development",
    );
  const { data, error } = await db
    .from("comun_archive_rights_removal_requests")
    .insert({
      archive_item_id: parsed.data.archiveItemId || null,
      request_type: parsed.data.requestType,
      requester_contact_private: parsed.data.contact.trim(),
      reason_private: parsed.data.reason.trim(),
      submitter_hash: submitterHash,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Nao foi possivel registrar a solicitacao." },
      { status: 500 },
    );
  await logComunAdminAction({
    action: "archive_rights_removal_requested",
    targetType: "archive_rights_request",
    targetId: data.id,
    metadata: {
      request_type: parsed.data.requestType,
      archive_item_id: parsed.data.archiveItemId || null,
    },
  });
  return NextResponse.json({
    ok: true,
    protocol: `DIREITOS-${data.id.slice(0, 8).toUpperCase()}`,
  });
}
