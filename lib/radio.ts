import { RADIO_V1_MEDIA_PROFILE } from "./radio-media-profile.mjs";

export const radioFormats = [
  "news",
  "interview",
  "debate",
  "storytelling",
  "music",
  "cultural",
  "educational",
  "bulletin",
  "documentary",
  "children",
  "mixed",
  "other",
] as const;
export function radioPublicationBlockers(x: {
  title?: string;
  summary?: string;
  program?: string;
  duration?: number;
  publicAudio?: boolean;
  credits?: number;
  consents?: { consent_status: string; allow_comun_audio: boolean }[];
  music?: { rights_status: string; allow_streaming: boolean }[];
  minor?: boolean;
  minorApproved?: boolean;
  context?: boolean;
  transcriptStatus?: string;
  transcriptExceptionDocumented?: boolean;
}) {
  const b: string[] = [];
  if (!x.title) b.push("title");
  if (!x.summary) b.push("summary");
  if (!x.program) b.push("program");
  if (!x.duration) b.push("duration");
  else if (x.duration > RADIO_V1_MEDIA_PROFILE.maxDurationSeconds)
    b.push("duration_limit");
  if (!x.publicAudio) b.push("public_audio");
  if (!x.credits) b.push("credits");
  if (!x.consents?.length && x.consents !== undefined) b.push("voice_consent");
  if (
    x.consents?.some(
      (c) => c.consent_status !== "approved" || !c.allow_comun_audio,
    )
  )
    b.push("voice_consent");
  if (
    x.music?.some(
      (m) =>
        !["approved", "public_domain_verified"].includes(m.rights_status) ||
        !m.allow_streaming,
    )
  )
    b.push("music_rights");
  if (x.minor && !x.minorApproved) b.push("minor_review");
  if (!x.context) b.push("context");
  if (x.transcriptStatus !== "published" && !x.transcriptExceptionDocumented)
    b.push("transcript_status");
  return [...new Set(b)];
}
export async function listPublicRadio() {
  const { createServiceSupabaseClient } = await import("@/lib/supabase/server");
  const db = createServiceSupabaseClient();
  if (!db) return { programs: [], episodes: [], schedule: [] };
  const [{ data: programs }, { data: episodes }, { data: schedule }] =
    await Promise.all([
      db
        .from("comun_radio_programs")
        .select(
          "archive_item_id,title_public,slug_public,subtitle_public,description_public,format_type,frequency_public,territory:comun_hub_territories(slug,name,visibility,status),pauta:comun_pauta_spaces(slug,title,visibility,status)",
        )
        .eq("publication_status", "published")
        .limit(24),
      db
        .from("comun_radio_episodes")
        .select(
          "archive_item_id,program_item_id,title_public,slug_public,summary_public,published_at,duration_seconds,transcript_status,territory:comun_hub_territories(slug,name,visibility,status),pauta:comun_pauta_spaces(slug,title,visibility,status),action:comun_mobilization_actions(slug,title,visibility,status),comun_archive_assets(asset_role,bucket_scope,public_url,review_status)",
        )
        .eq("publication_status", "published")
        .order("published_at", { ascending: false })
        .limit(24),
      db
        .from("comun_radio_schedule_entries")
        .select("id,title_public,starts_at,ends_at,schedule_type,public_note")
        .eq("status", "published")
        .order("starts_at")
        .limit(30),
    ]);
  const episodeIds = (episodes ?? []).map((episode: any) => episode.archive_item_id).filter(Boolean);
  const [{ data: roots }, { data: consents }, { data: music }, { data: safety }] = episodeIds.length ? await Promise.all([
    db.from("comun_archive_items").select("id,status,visibility,published_at").in("id", episodeIds),
    db.from("comun_radio_voice_consents").select("episode_item_id,consent_status,allow_comun_audio,valid_from,valid_until").in("episode_item_id", episodeIds),
    db.from("comun_radio_music_uses").select("episode_item_id,rights_status,allow_streaming").in("episode_item_id", episodeIds),
    db.from("comun_radio_safety_reviews").select("episode_item_id,reinforced_review_status").in("episode_item_id", episodeIds),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const rootById = new Map((roots ?? []).map((x: any) => [x.id, x]));
  const consentById = new Map<string, any[]>(); for (const row of consents ?? []) consentById.set(row.episode_item_id, [...(consentById.get(row.episode_item_id) ?? []), row]);
  const musicById = new Map<string, any[]>(); for (const row of music ?? []) musicById.set(row.episode_item_id, [...(musicById.get(row.episode_item_id) ?? []), row]);
  const safetyById = new Map((safety ?? []).map((x: any) => [x.episode_item_id, x]));
  const eligibleEpisode = (episode: any) => { const root = rootById.get(episode.archive_item_id); const c = consentById.get(episode.archive_item_id) ?? []; const m = musicById.get(episode.archive_item_id) ?? []; const s = safetyById.get(episode.archive_item_id); return Boolean(root?.status === "published" && root.visibility === "public" && root.published_at && c.length && c.every((x) => x.consent_status === "approved" && x.allow_comun_audio) && m.every((x) => ["approved", "public_domain_verified"].includes(x.rights_status) && x.allow_streaming) && (!s || s.reinforced_review_status === "not_required" || s.reinforced_review_status === "approved")); };
  return {
    programs: (programs ?? []).filter(
      (program: any) =>
        (!program.territory || program.territory.visibility === "public") &&
        (!program.pauta || program.pauta.visibility === "public"),
    ),
    episodes: (episodes ?? [])
      .map((episode: any) => ({
        ...episode,
        comun_archive_assets: (episode.comun_archive_assets ?? []).filter(
          (asset: any) =>
            asset.bucket_scope === "public_safe" &&
            asset.review_status === "approved" &&
            Boolean(asset.public_url),
        ),
      }))
      .filter(
        (episode: any) =>
          eligibleEpisode(episode) &&
          (!episode.territory || episode.territory.visibility === "public") &&
          (!episode.pauta || episode.pauta.visibility === "public") &&
          (!episode.action || episode.action.visibility === "public"),
      ),
    schedule: schedule ?? [],
  };
}
export async function getPublicEpisode(slug: string) {
  const { createServiceSupabaseClient } = await import("@/lib/supabase/server");
  const db = createServiceSupabaseClient();
  if (!db) return null;
  const { data: e } = await db
    .from("comun_radio_episodes")
    .select(
      "archive_item_id,program_item_id,season_number,episode_number,title_public,slug_public,summary_public,description_public,recorded_at,published_at,duration_seconds,transcript_status,allow_download,territory:comun_hub_territories(slug,name,visibility,status),pauta:comun_pauta_spaces(slug,title,visibility,status),action:comun_mobilization_actions(slug,title,visibility,status)",
    )
    .eq("slug_public", slug)
    .eq("publication_status", "published")
    .maybeSingle();
  if (
    !e ||
    ((e as any).territory && (e as any).territory.visibility !== "public") ||
    ((e as any).pauta && (e as any).pauta.visibility !== "public") ||
    ((e as any).action && (e as any).action.visibility !== "public")
  )
    return null;
  const [
    { data: t },
    { data: program },
    { data: assets },
    { data: credits },
    { data: music },
    { data: chapters },
  ] = await Promise.all([
    db
      .from("comun_radio_transcript_versions")
      .select("content,transcript_type")
      .eq("episode_item_id", e.archive_item_id)
      .eq("status", "published")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("comun_radio_programs")
      .select("title_public,slug_public")
      .eq("archive_item_id", e.program_item_id)
      .eq("publication_status", "published")
      .maybeSingle(),
    db
      .from("comun_archive_assets")
      .select("asset_role,public_url,review_status")
      .eq("archive_item_id", e.archive_item_id)
      .eq("bucket_scope", "public_safe")
      .eq("review_status", "approved")
      .not("public_url", "is", null)
      .in("asset_role", [
        "radio_public_episode",
        "radio_public_preview",
        "radio_waveform",
        "radio_cover_derivative",
      ]),
    db
      .from("comun_radio_credits")
      .select("public_credit,credit_role,position,public_visibility")
      .eq("episode_item_id", e.archive_item_id)
      .eq("public_visibility", "public")
      .order("position"),
    db
      .from("comun_radio_music_uses")
      .select(
        "title_public,performer_public,composer_public,usage_type,license_public,rights_status",
      )
      .eq("episode_item_id", e.archive_item_id)
      .in("rights_status", ["approved", "public_domain_verified"]),
    db
      .from("comun_radio_episode_chapters")
      .select("start_seconds,end_seconds,title_public,summary_public,position")
      .eq("episode_item_id", e.archive_item_id)
      .order("position"),
  ]);
  return {
    ...e,
    comun_radio_programs: program,
    comun_archive_assets: assets ?? [],
    comun_radio_credits: credits ?? [],
    comun_radio_music_uses: music ?? [],
    comun_radio_episode_chapters: chapters ?? [],
    transcript: t,
  };
}
