import { NextResponse } from "next/server";
import { z } from "zod";
import { createWalletToken, walletSecretHash } from "@/lib/comun-participation-wallet-runtime";
import { isComunCulturalSaveFirstIntakeEnabled } from "@/lib/comun-cultural-contribution-feature";
import { createServiceSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ intentText: z.string().trim().min(1).max(10000), requestId: z.string().uuid(), sourceSurface: z.string().trim().min(1).max(80).default("acervo_vivo") });
const COOKIE = "comun_cultural_resume_v1";

export async function POST(request: Request) {
  if (!isComunCulturalSaveFirstIntakeEnabled()) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Escreva o que você quer guardar na memória." }, { status: 400 });
  const db = createServiceSupabaseClient(); if (!db) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const auth = await createSupabaseServerClient(); const { data: userData } = auth ? await auth.auth.getUser() : { data: { user: null } };
  const existing = request.headers.get("cookie")?.match(new RegExp(`${COOKIE}=([^;]+)`))?.[1] ?? null;
  const token = existing && /^[A-Za-z0-9_-]{32,80}$/.test(existing) ? existing : createWalletToken();
  const { data, error } = await db.rpc("comun_create_cultural_contribution_intake_v1", { p_intent_text_private: parsed.data.intentText, p_source_surface: parsed.data.sourceSurface, p_request_id: parsed.data.requestId, p_resume_token_hash: walletSecretHash(token), p_member_user_id: userData.user?.id ?? null });
  if (error) return NextResponse.json({ error: error.message === "rate_limited" ? "Você já fez alguns envios recentes. Tente novamente mais tarde." : "Não foi possível guardar esta memória." }, { status: error.message === "rate_limited" ? 429 : 500 });
  const row = Array.isArray(data) ? data[0] : data; const response = NextResponse.json({ protocol: row?.public_protocol, status: row?.status, next: "choose_type" });
  response.cookies.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
