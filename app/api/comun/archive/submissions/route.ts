import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logComunAdminAction } from "@/lib/admin-audit";
import { hashSubmitter } from "@/lib/historical-photo";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  titleSuggestion: z.string().min(2).max(160),
  city: z.string().min(2).max(100),
  neighborhood: z.string().max(100).optional(),
  placeName: z.string().max(160).optional(),
  approximateDate: z.string().max(80).optional(),
  descriptionSuggestion: z.string().min(10).max(4000),
  photographerName: z.string().max(160).optional(),
  relationshipToMaterial: z.string().min(2).max(500),
  sourceName: z.string().min(2).max(300),
  sourceStory: z.string().max(2000).optional(),
  rightsDeclaration: z.string().min(10).max(1000),
  permissionConfirmed: z.literal(true),
  contributorCreditPreference: z.enum([
    "anonymous",
    "contributor_name",
    "custom_credit",
  ]),
  publicCredit: z.string().max(160).optional(),
  contributorName: z.string().max(160).optional(),
  contributorContactPrivate: z.string().max(300).optional(),
  contactAuthorized: z.boolean().default(false),
  website: z.string().max(0),
  challengeAnswer: z.literal("7"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revise os dados da contribuicao." },
      { status: 400 },
    );
  const db = createServiceSupabaseClient();
  if (!db)
    return NextResponse.json(
      { error: "Servico indisponivel." },
      { status: 503 },
    );
  const h = await headers();
  const identity = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const submitterHash = hashSubmitter(
    identity,
    process.env.COMUN_LOOKUP_HASH_SALT || "local-development",
  );
  const hour = new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    day = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
    db
      .from("comun_archive_submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitter_hash", submitterHash)
      .gte("created_at", hour),
    db
      .from("comun_archive_submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitter_hash", submitterHash)
      .gte("created_at", day),
  ]);
  if ((hourCount ?? 0) >= 3 || (dayCount ?? 0) >= 10) {
    await logComunAdminAction({
      action: "archive_submission_rate_limited",
      targetType: "archive_submission",
      metadata: { window: (hourCount ?? 0) >= 3 ? "hour" : "day" },
    });
    return NextResponse.json(
      { error: "Muitas contribuicoes recentes. Tente novamente mais tarde." },
      { status: 429 },
    );
  }
  const d = parsed.data;
  const { data, error } = await db
    .from("comun_archive_submissions")
    .insert({
      status: "awaiting_upload",
      title_suggestion: d.titleSuggestion.trim(),
      city: d.city.trim(),
      neighborhood: d.neighborhood?.trim() || null,
      place_name: d.placeName?.trim() || null,
      approximate_date: d.approximateDate?.trim() || null,
      description_suggestion: d.descriptionSuggestion.trim(),
      photographer_name: d.photographerName?.trim() || null,
      relationship_to_material: d.relationshipToMaterial.trim(),
      source_name: d.sourceName.trim(),
      source_story: d.sourceStory?.trim() || null,
      rights_declaration: d.rightsDeclaration.trim(),
      permission_confirmed: true,
      contributor_credit_preference: d.contributorCreditPreference,
      public_credit: d.publicCredit?.trim() || null,
      contributor_name: d.contributorName?.trim() || null,
      contributor_contact_private: d.contributorContactPrivate?.trim() || null,
      contact_authorized: d.contactAuthorized,
      submitter_hash: submitterHash,
    })
    .select("id")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Nao foi possivel registrar a contribuicao." },
      { status: 500 },
    );
  await logComunAdminAction({
    action: "archive_submission_created",
    targetType: "archive_submission",
    targetId: data.id,
    metadata: {
      city: d.city,
      credit_preference: d.contributorCreditPreference,
    },
  });
  return NextResponse.json({
    submissionId: data.id,
    protocol: `ACERVO-${data.id.slice(0, 8).toUpperCase()}`,
  });
}
