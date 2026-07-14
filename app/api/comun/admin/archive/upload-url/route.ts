import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getComunAdminSession } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { getMediaStorage, publicMediaUrl } from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const ROLES = new Set(["original", "public_version", "cover"]);
const MAX_URLS_PER_10_MINUTES = 20;

export async function POST(request: Request) {
  const session = await getComunAdminSession();
  if (
    !session ||
    !(["admin", "editor"] as string[]).includes(session.admin.role)
  )
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const db = createServiceSupabaseClient();
  if (!db)
    return NextResponse.json(
      { error: "Supabase nao configurado." },
      { status: 500 },
    );
  let assetId: string | null = null;
  try {
    const body = (await request.json()) as {
      archiveItemId: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      role: "original" | "public_version" | "cover";
    };
    if (!body.archiveItemId || !body.filename || !ROLES.has(body.role))
      throw new Error("Dados de upload incompletos.");
    if (
      body.mimeType.startsWith("audio/") ||
      body.mimeType.startsWith("video/")
    )
      throw new Error("Upload de audio e video esta bloqueado neste sprint.");
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: rateLimitError } = await db
      .from("comun_admin_audit_log")
      .select("id", { count: "exact", head: true })
      .eq("admin_user_id", session.admin.id)
      .eq("action", "archive_upload_url_created")
      .gte("created_at", since);
    if (rateLimitError)
      throw new Error("Nao foi possivel validar o limite de uploads.");
    if ((count ?? 0) >= MAX_URLS_PER_10_MINUTES) {
      await logComunAdminAction({
        session,
        action: "archive_upload_rate_limited",
        targetType: "archive_item",
        targetId: body.archiveItemId,
      });
      return NextResponse.json(
        {
          error:
            "Limite temporario de URLs de upload atingido. Aguarde alguns minutos.",
        },
        { status: 429 },
      );
    }
    const { data: item } = await db
      .from("comun_archive_items")
      .select("id")
      .eq("id", body.archiveItemId)
      .maybeSingle();
    if (!item) throw new Error("Item do Acervo nao encontrado.");
    const extension = body.filename.split(".").pop()?.toLowerCase() ?? "";
    const scope =
      body.role === "original" ? "private_original" : ("public_safe" as const);
    const created = await db
      .from("comun_archive_assets")
      .insert({
        archive_item_id: body.archiveItemId,
        asset_role: body.role,
        bucket_scope: scope,
        object_key: `smoke/pending/${randomUUID()}`,
        public_url: null,
        original_filename: body.filename,
        mime_type: body.mimeType,
        size_bytes: body.sizeBytes,
        review_status: "pending",
      })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);
    assetId = created.data.id;
    const key =
      scope === "private_original"
        ? `originals/${body.archiveItemId}/${randomUUID()}.${extension}`
        : `public/${body.archiveItemId}/${assetId}/${randomUUID()}.${extension}`;
    const signed = await getMediaStorage().createUploadUrl({
      scope,
      key,
      contentType: body.mimeType,
      sizeBytes: body.sizeBytes,
    });
    const updated = await db
      .from("comun_archive_assets")
      .update({
        object_key: key,
        public_url: scope === "public_safe" ? publicMediaUrl(key) : null,
      })
      .eq("id", assetId);
    if (updated.error) throw new Error(updated.error.message);
    await logComunAdminAction({
      session,
      action: "archive_upload_url_created",
      targetType: "archive_asset",
      targetId: assetId,
      metadata: {
        archive_item_id: body.archiveItemId,
        mime_type: body.mimeType,
        size_bytes: body.sizeBytes,
        bucket_scope: scope,
      },
    });
    return NextResponse.json({
      assetId,
      uploadUrl: signed.url,
      expiresAt: signed.expiresAt,
    });
  } catch (error) {
    if (assetId)
      await db.from("comun_archive_assets").delete().eq("id", assetId);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao preparar upload.",
      },
      { status: 400 },
    );
  }
}
