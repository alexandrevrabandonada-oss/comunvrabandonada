import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { isComunCulturalSaveFirstIntakeEnabled } from "@/lib/comun-cultural-contribution-feature";
import { isComunCulturalSpecializedHandoffEnabled, specializedHandoffPath } from "@/lib/comun-cultural-handoff-feature";
import { walletSecretHash } from "@/lib/comun-participation-wallet-runtime";

const COOKIE = "comun_cultural_resume_v1";
const schema = z.object({ routeKind: z.enum(["photo_or_document", "art", "oral_history", "radio", "unknown"]) });

export async function GET(request: Request, context: { params: Promise<{ protocol: string }> }) {
  if (!isComunCulturalSaveFirstIntakeEnabled()) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const db = createServiceSupabaseClient(); if (!db) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const auth = await createSupabaseServerClient(); const { data: userData } = auth ? await auth.auth.getUser() : { data: { user: null } }; const cookie = request.headers.get("cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1] ?? null;
  const { data, error } = await db.rpc("comun_get_cultural_contribution_intake_v1", { p_public_protocol: (await context.params).protocol, p_resume_token_hash: cookie ? walletSecretHash(cookie) : null, p_member_user_id: userData.user?.id ?? null });
  if (error) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ protocol: row.public_protocol, status: row.status, routeKind: row.route_kind, intentText: row.intent_text_private, createdAt: row.created_at });
}

export async function POST(request: Request, context: { params: Promise<{ protocol: string }> }) {
  if (!isComunCulturalSaveFirstIntakeEnabled()) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Escolha uma forma de continuar." }, { status: 400 });
  const db = createServiceSupabaseClient(); if (!db) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const auth = await createSupabaseServerClient(); const { data: userData } = auth ? await auth.auth.getUser() : { data: { user: null } }; const cookie = request.headers.get("cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1] ?? null;
  const { data, error } = await db.rpc("comun_route_cultural_contribution_intake_v1", { p_public_protocol: (await context.params).protocol, p_route_kind: parsed.data.routeKind, p_resume_token_hash: cookie ? walletSecretHash(cookie) : null, p_member_user_id: userData.user?.id ?? null });
  if (error) return NextResponse.json({ error: "Este envio não está disponível neste dispositivo ou conta." }, { status: 404 });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return NextResponse.json({ error: "Este envio não está disponível neste dispositivo ou conta." }, { status: 404 });
  let handoff: any = null;
  if (isComunCulturalSpecializedHandoffEnabled()) {
    const result = await db.rpc("comun_prepare_cultural_contribution_handoff_v1", { p_public_protocol: row.public_protocol, p_resume_token_hash: cookie ? walletSecretHash(cookie) : null, p_member_user_id: userData.user?.id ?? null });
    handoff = Array.isArray(result.data) ? result.data[0] : result.data;
    if (result.error || !handoff) return NextResponse.json({ error: "Continuidade indisponível." }, { status: 503 });
  }
  return NextResponse.json({
    protocol: row.public_protocol,
    status: handoff?.status ?? row.status,
    routeKind: handoff?.route_kind ?? row.route_kind,
    handoffState: handoff?.handoff_state ?? "routed",
    targetKind: handoff?.target_kind ?? null,
    targetCreated: handoff?.target_created === true,
    continuationPath: handoff?.target_created ? specializedHandoffPath(handoff.route_kind, row.public_protocol) : null,
  });
}
