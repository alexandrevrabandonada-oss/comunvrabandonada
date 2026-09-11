import { NextResponse } from "next/server";
import { getComunAdminSession } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { getMediaStorage } from "@/lib/media-storage";
import { processRadioAudio } from "@/lib/radio-audio";
import { radioProcessingPublicError } from "@/lib/radio-media-profile.mjs";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await getComunAdminSession();
  if (!session || !["admin", "editor"].includes(session.admin.role))
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  const db = createServiceSupabaseClient();
  if (!db)
    return NextResponse.json({ error: "Banco indisponivel." }, { status: 500 });
  const { episodeId, assetId } = (await request.json()) as {
    episodeId: string;
    assetId: string;
  };
  const checks = await Promise.all([
    db
      .from("comun_archive_assets")
      .select(
        "id,object_key,mime_type,original_filename,asset_role,bucket_scope",
      )
      .eq("id", assetId)
      .eq("archive_item_id", episodeId)
      .maybeSingle(),
    db
      .from("comun_radio_voice_consents")
      .select("consent_status,allow_comun_audio")
      .eq("episode_item_id", episodeId),
    db
      .from("comun_radio_music_uses")
      .select("rights_status,allow_streaming")
      .eq("episode_item_id", episodeId),
    db
      .from("comun_radio_safety_reviews")
      .select("minor_involved_private,reinforced_review_status")
      .eq("episode_item_id", episodeId)
      .maybeSingle(),
    db
      .from("comun_radio_episodes")
      .select("archive_item_id")
      .eq("archive_item_id", episodeId)
      .maybeSingle(),
  ]);
  if (checks.some((result) => result.error))
    return NextResponse.json(
      { error: "Não foi possível verificar os direitos do áudio." },
      { status: 503 },
    );
  const [
    { data: asset },
    { data: consents },
    { data: music },
    { data: safety },
    { data: episode },
  ] = checks;
  if (!episode)
    return NextResponse.json(
      { error: "Episódio não encontrado." },
      { status: 404 },
    );
  if (
    safety?.minor_involved_private &&
    safety.reinforced_review_status !== "approved"
  )
    return NextResponse.json(
      {
        error:
          "Revisão de proteção de menores ainda bloqueia a derivada pública.",
      },
      { status: 409 },
    );
  if (
    !asset ||
    asset.asset_role !== "radio_private_original" ||
    asset.bucket_scope !== "private_original"
  )
    return NextResponse.json(
      { error: "Original privado invalido." },
      { status: 400 },
    );
  if (
    !consents?.length ||
    consents.some(
      (c) => c.consent_status !== "approved" || !c.allow_comun_audio,
    )
  )
    return NextResponse.json(
      { error: "Consentimento de voz ainda bloqueia a derivada publica." },
      { status: 409 },
    );
  if (
    music?.some(
      (m) =>
        !["approved", "public_domain_verified"].includes(m.rights_status) ||
        !m.allow_streaming,
    )
  )
    return NextResponse.json(
      { error: "Direitos musicais ainda bloqueiam a derivada publica." },
      { status: 409 },
    );
  const claim = await db.rpc("comun_claim_radio_processing", {
    p_episode_id: episodeId,
  });
  if (claim.error)
    return NextResponse.json(
      { error: "Não foi possível reservar o processamento." },
      { status: 503 },
    );
  if (claim.data !== true)
    return NextResponse.json(
      {
        error:
          "O episódio já está em processamento ou não aceita novas derivadas.",
      },
      { status: 409 },
    );
  await logComunAdminAction({
    session,
    action: "radio_processing_started",
    targetType: "community_radio_episode",
    targetId: episodeId,
    metadata: { processor: "ffmpeg_local" },
  });
  try {
    const result = await processRadioAudio({
      episodeId,
      originalKey: asset.object_key,
      mime: asset.mime_type,
      filename: asset.original_filename ?? "original.wav",
      provider: getMediaStorage(),
    });
    await db
      .from("comun_archive_assets")
      .delete()
      .eq("archive_item_id", episodeId)
      .in("asset_role", ["radio_public_episode", "radio_waveform"]);
    const { error } = await db.from("comun_archive_assets").insert([
      {
        archive_item_id: episodeId,
        asset_role: "radio_public_episode",
        bucket_scope: "public_safe",
        object_key: result.audio.key,
        public_url: result.audio.url,
        original_filename: "episode.mp3",
        mime_type: "audio/mpeg",
        size_bytes: result.audio.size,
        checksum_sha256: result.audio.checksum,
        review_status: "approved",
      },
      {
        archive_item_id: episodeId,
        asset_role: "radio_waveform",
        bucket_scope: "public_safe",
        object_key: result.waveform.key,
        public_url: result.waveform.url,
        original_filename: "waveform.json",
        mime_type: "application/json",
        size_bytes: result.waveform.size,
        review_status: "approved",
      },
    ]);
    if (error) throw error;
    const finalized = await db.rpc("comun_finish_radio_processing", {
      p_episode_id: episodeId,
      p_duration: result.meta.duration,
    });
    if (finalized.error || finalized.data !== true) {
      await db
        .from("comun_archive_assets")
        .delete()
        .eq("archive_item_id", episodeId)
        .in("asset_role", ["radio_public_episode", "radio_waveform"]);
      await Promise.allSettled([
        getMediaStorage().deleteObject("public_safe", result.audio.key),
        getMediaStorage().deleteObject("public_safe", result.waveform.key),
      ]);
      return NextResponse.json(
        { error: "O episódio foi retirado durante o processamento." },
        { status: 409 },
      );
    }
    await logComunAdminAction({
      session,
      action: "radio_public_audio_generated",
      targetType: "community_radio_episode",
      targetId: episodeId,
      metadata: {
        duration_seconds: result.meta.duration,
        channels: result.meta.channels,
        waveform_points: result.waveform.points,
      },
    });
    return NextResponse.json({
      ok: true,
      durationSeconds: result.meta.duration,
    });
  } catch (error) {
    await db
      .from("comun_radio_episodes")
      .update({ publication_status: "editorial_review" })
      .eq("archive_item_id", episodeId)
      .eq("publication_status", "audio_processing");
    await logComunAdminAction({
      session,
      action: "radio_processing_failed",
      targetType: "community_radio_episode",
      targetId: episodeId,
      metadata: {
        reason:
          error instanceof Error
            ? error.message.slice(0, 120)
            : "processing_failed",
      },
    });
    return NextResponse.json(
      {
        error: radioProcessingPublicError(
          error instanceof Error ? error.message : "processing_failed",
        ),
      },
      { status: 400 },
    );
  }
}
