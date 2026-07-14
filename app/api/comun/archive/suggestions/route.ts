import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logComunAdminAction } from "@/lib/admin-audit";
import { hashSubmitter } from "@/lib/historical-photo";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
const schema = z.object({
  archiveItemId: z.string().uuid(),
  suggestionType: z.enum([
    "date_correction",
    "place_identification",
    "event_context",
    "photographer_information",
    "source_information",
    "person_information",
    "historical_context",
    "other",
  ]),
  suggestionText: z.string().min(10).max(3000),
  contributorAlias: z.string().max(120).optional(),
  contactPrivate: z.string().max(300).optional(),
  sourceReference: z.string().max(1000).optional(),
  website: z.string().max(0),
  challengeAnswer: z.literal("7"),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Revise a sugestao." }, { status: 400 });
  const db = createServiceSupabaseClient();
  if (!db)
    return NextResponse.json(
      { error: "Servico indisponivel." },
      { status: 503 },
    );
  const { data: item } = await db
    .from("comun_archive_items")
    .select("id")
    .eq("id", parsed.data.archiveItemId)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();
  if (!item)
    return NextResponse.json(
      { error: "Memoria nao encontrada." },
      { status: 404 },
    );
  const h = await headers();
  const identity = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const submitterHash = hashSubmitter(
    identity,
    process.env.COMUN_LOOKUP_HASH_SALT || "local-development",
  );
  const risk =
    parsed.data.suggestionType === "person_information" ? "high" : "normal";
  const { data, error } = await db
    .from("comun_archive_item_suggestions")
    .insert({
      archive_item_id: item.id,
      suggestion_type: parsed.data.suggestionType,
      suggestion_text: parsed.data.suggestionText.trim(),
      contributor_alias: parsed.data.contributorAlias?.trim() || null,
      contact_private: parsed.data.contactPrivate?.trim() || null,
      source_reference: parsed.data.sourceReference?.trim() || null,
      risk_level: risk,
      submitter_hash: submitterHash,
      status: "pending",
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Nao foi possivel receber a sugestao." },
      { status: 500 },
    );
  await logComunAdminAction({
    action: "archive_suggestion_created",
    targetType: "archive_suggestion",
    targetId: data.id,
    metadata: {
      suggestion_type: parsed.data.suggestionType,
      risk_level: risk,
      archive_item_id: item.id,
    },
  });
  return NextResponse.json({ ok: true });
}
