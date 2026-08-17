import { createServiceSupabaseClient } from "../supabase/server";
import { sanitizeMusicFilters } from "./music-curation-rules";
import { isPublicArchiveAssetEligible } from "@/lib/archive/public-gates";

export const MUSIC_HOSTS: Record<string, string[]> = {
  youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
  spotify: ["spotify.com", "www.spotify.com", "open.spotify.com"],
  soundcloud: ["soundcloud.com", "www.soundcloud.com"],
  bandcamp: ["bandcamp.com"],
  apple_music: ["apple.com", "music.apple.com"],
  deezer: ["deezer.com", "www.deezer.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com"],
};

export function validateArchiveMusicExternalLink(raw: string, platform: string, reviewedOfficialHost?: string) {
  let url: URL;
  try { url = new URL(raw); } catch { return { ok: false as const, reason: "URL inválida." }; }
  if (url.protocol !== "https:") return { ok: false as const, reason: "Somente HTTPS é aceito." };
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const allow = platform === "official_website" && reviewedOfficialHost
    ? [reviewedOfficialHost.toLowerCase()]
    : MUSIC_HOSTS[platform] ?? [];
  const allowed = allow.some((host) => hostname === host || (platform === "bandcamp" && hostname.endsWith(`.${host}`)));
  if (!allowed) return { ok: false as const, reason: "Domínio não permitido para a plataforma." };
  ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid","si"].forEach((key) => url.searchParams.delete(key));
  url.hash = "";
  return { ok: true as const, url: url.toString() };
}

export function canPublishArtist(input: { stageName?: string|null; city?: string|null; biography?: string|null; source?: string|null; rightsStatus?: string|null; linksValid: boolean; privateContactLeaked?: boolean }) {
  return Boolean(input.stageName?.trim() && input.city?.trim() && input.biography?.trim() && input.source?.trim() && input.rightsStatus && input.rightsStatus !== "unknown" && input.linksValid && !input.privateContactLeaked);
}

export function canPublishMusicRelease(input: { title?: string|null; artistReady: boolean; releaseType?: string|null; hasKnownOrExplicitUnknownDate: boolean; coverAuthorizedOrAbsent: boolean; linksReviewed: boolean; credits?: string|null; rightsStatus?: string|null }) {
  return Boolean(input.title?.trim() && input.artistReady && input.releaseType && input.hasKnownOrExplicitUnknownDate && input.coverAuthorizedOrAbsent && input.linksReviewed && input.credits?.trim() && ["external_link_only","permission_granted","licensed","public_domain"].includes(input.rightsStatus ?? ""));
}

const itemFields = "id,slug,item_type,title,summary,description,city,neighborhood,year_start,year_end,source_name,credits,rights_status,published_at";
export async function listPublicArtists(filters: Record<string,string|undefined> = {}) {
  const db=createServiceSupabaseClient(),f=sanitizeMusicFilters(filters); if(!db) return {items:[],total:0,facets:{cities:[],genres:[],types:[],statuses:[]},page:f.page};
  let q:any=db.from("comun_archive_items").select(`${itemFields},comun_archive_artist_profiles!inner(stage_name,artist_type,genres,formation_year,end_year,active_status,city,neighborhood,biography_public,members_public,former_members_public,influences_public,official_contact_public),comun_archive_music_releases(archive_item_id)`,{count:"exact"}).eq("item_type","artist").eq("status","published").eq("visibility","public").not("published_at","is",null).order("title").range((f.page-1)*f.pageSize,f.page*f.pageSize-1);
  if(f.city)q=q.eq("comun_archive_artist_profiles.city",f.city);if(f.neighborhood)q=q.eq("comun_archive_artist_profiles.neighborhood",f.neighborhood);if(f.status)q=q.eq("comun_archive_artist_profiles.active_status",f.status);if(f.type)q=q.eq("comun_archive_artist_profiles.artist_type",f.type);if(f.genre)q=q.contains("comun_archive_artist_profiles.genres",[f.genre]);if(f.with_releases)q=q.not("comun_archive_music_releases","is",null);if(f.q)q=q.or(`title.ilike.%${f.q}%,description.ilike.%${f.q}%,genre.ilike.%${f.q}%`);
  const [{data,count},{data:all}]=await Promise.all([q,db.from("comun_archive_artist_profiles").select("city,genres,artist_type,active_status")]);const unique=(xs:(string|null|undefined)[])=>[...new Set(xs.filter(Boolean)as string[])].sort();return{items:data??[],total:count??0,page:f.page,facets:{cities:unique((all??[]).map(x=>x.city)),genres:unique((all??[]).flatMap(x=>x.genres??[])),types:unique((all??[]).map(x=>x.artist_type)),statuses:unique((all??[]).map(x=>x.active_status))}};
}
export async function getPublicArtist(slug:string){
  const db=createServiceSupabaseClient();if(!db)return null;
  const {data:item}=await db.from("comun_archive_items").select(itemFields).eq("slug",slug).eq("item_type","artist").eq("status","published").eq("visibility","public").maybeSingle();if(!item)return null;
  const [profile,members,links,releases,assets]=await Promise.all([
    db.from("comun_archive_artist_profiles").select("stage_name,artist_type,genres,formation_year,end_year,active_status,city,neighborhood,biography_public,members_public,former_members_public,influences_public,official_contact_public").eq("archive_item_id",item.id).maybeSingle(),
    db.from("comun_archive_artist_memberships").select("id,member_name,role_public,started_year,ended_year,status,source_public").eq("artist_item_id",item.id),
    db.from("comun_archive_external_links").select("id,platform,url,link_type,official_status,display_label,position").eq("archive_item_id",item.id).in("official_status",["official","authorized"]).order("position"),
    db.from("comun_archive_music_releases").select(`release_type,release_date,release_year,label_name,comun_archive_items!comun_archive_music_releases_archive_item_id_fkey(${itemFields})`).eq("primary_artist_item_id",item.id),
    db.from("comun_archive_assets").select("id,public_url,alt_text,credits,asset_role").eq("archive_item_id",item.id).eq("bucket_scope","public_safe").eq("review_status","approved")]);
  return {item,profile:profile.data,members:members.data??[],links:links.data??[],releases:releases.data??[],assets:(assets.data??[]).filter(isPublicArchiveAssetEligible)};
}
export async function listPublicReleases(filters:Record<string,string|undefined>={}){const db=createServiceSupabaseClient(),f=sanitizeMusicFilters(filters);if(!db)return{items:[],total:0,page:f.page,facets:{types:[],decades:[]}};const{data:parents}=await db.from("comun_archive_items").select("id").eq("item_type","music_release").eq("status","published").eq("visibility","public");const ids=(parents??[]).map(x=>x.id);if(!ids.length)return{items:[],total:0,page:f.page,facets:{types:[],decades:[]}};let q:any=db.from("comun_archive_items").select(`${itemFields},comun_archive_music_releases!inner(release_type,release_date,release_year,label_name,primary_artist_item_id),comun_archive_external_links!left(id,official_status)`,{count:"exact"}).in("id",ids).eq("item_type","music_release").eq("status","published").eq("visibility","public").order("title").range((f.page-1)*f.pageSize,f.page*f.pageSize-1);if(f.type)q=q.eq("comun_archive_music_releases.release_type",f.type);if(f.decade)q=q.gte("comun_archive_music_releases.release_year",f.decade).lte("comun_archive_music_releases.release_year",f.decade+9);if(f.artist)q=q.eq("comun_archive_music_releases.primary_artist_item_id",f.artist);if(f.q)q=q.or(`title.ilike.%${f.q}%,description.ilike.%${f.q}%,credits.ilike.%${f.q}%`);if(f.with_links)q=q.in("comun_archive_external_links.official_status",["official","authorized"]);const[{data,count},{data:all}]=await Promise.all([q,db.from("comun_archive_music_releases").select("release_type,release_year").in("archive_item_id",ids)]);return{items:data??[],total:count??0,page:f.page,facets:{types:[...new Set((all??[]).map(x=>x.release_type))].sort(),decades:[...new Set((all??[]).flatMap(x=>x.release_year?[Math.floor(x.release_year/10)*10]:[]))].sort()}}}
export async function getPublicRelease(slug:string){const db=createServiceSupabaseClient();if(!db)return null;const {data:item}=await db.from("comun_archive_items").select(itemFields).eq("slug",slug).eq("item_type","music_release").eq("status","published").eq("visibility","public").maybeSingle();if(!item)return null;const [release,tracks,links,assets]=await Promise.all([db.from("comun_archive_music_releases").select("archive_item_id,primary_artist_item_id,release_type,release_date,release_year,label_name,catalog_number,producers_public,recording_location,rights_status,cover_asset_id,cover_absence_confirmed").eq("archive_item_id",item.id).maybeSingle(),db.from("comun_archive_music_tracks").select("id,title,track_number,disc_number,duration_seconds,writers_public,performers_public").eq("release_item_id",item.id).order("disc_number").order("track_number"),db.from("comun_archive_external_links").select("id,platform,url,link_type,official_status,display_label,position").eq("archive_item_id",item.id).in("official_status",["official","authorized"]).order("position"),db.from("comun_archive_assets").select("id,public_url,alt_text,credits,asset_role,bucket_scope,review_status,rights_status").eq("archive_item_id",item.id).eq("bucket_scope","public_safe").eq("review_status","approved")]);let artist=null;if(release.data?.primary_artist_item_id){const {data}=await db.from("comun_archive_items").select("slug,title").eq("id",release.data.primary_artist_item_id).eq("status","published").maybeSingle();artist=data}return {item,release:release.data,tracks:tracks.data??[],links:links.data??[],assets:(assets.data??[]).filter(isPublicArchiveAssetEligible),artist}}
