import { createServiceSupabaseClient } from '../supabase/server';
import { canExposeAudio, canExposeTranscript, embargoIsActive, publicParticipantName, type OralConsent } from './oral-history-rules';

const itemFields = 'id,slug,title,summary,city,neighborhood,approximate_date,year_start,year_end,credits,published_at';

export async function listPublicOralHistories(filters: Record<string, string | undefined> = {}) {
  const db = createServiceSupabaseClient();
  if (!db) return { items: [], total: 0 };
  let query = db.from('comun_archive_items').select(`${itemFields},comun_archive_oral_histories!inner(interview_title,interview_date,interview_date_approximate,recording_location_public,interviewer_public,duration_seconds,language,public_summary,editorial_context_public,embargo_until,publication_status)`, { count: 'exact' }).eq('item_type', 'oral_history').eq('status', 'published').eq('visibility', 'public').eq('comun_archive_oral_histories.publication_status', 'published').order('published_at', { ascending: false });
  if (filters.city) query = query.eq('city', filters.city.slice(0, 80));
  if (filters.neighborhood) query = query.eq('neighborhood', filters.neighborhood.slice(0, 80));
  if (filters.q) { const q = filters.q.replace(/[%_,()]/g, ' ').slice(0, 100); query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,description.ilike.%${q}%,city.ilike.%${q}%,neighborhood.ilike.%${q}%`); }
  const { data, count } = await query;
  const visible = (data ?? []).filter((row: any) => !embargoIsActive(row.comun_archive_oral_histories?.embargo_until));
  return { items: visible, total: count ?? visible.length };
}

export async function getPublicOralHistory(slug: string) {
  const db = createServiceSupabaseClient();
  if (!db) return null;
  const { data: item } = await db.from('comun_archive_items').select(itemFields).eq('slug', slug).eq('item_type', 'oral_history').eq('status', 'published').eq('visibility', 'public').maybeSingle();
  if (!item) return null;
  const [history, participants, consents, transcripts, segments, assets, collections, relations] = await Promise.all([
    db.from('comun_archive_oral_histories').select('interview_title,interview_date,interview_date_approximate,recording_location_public,interviewer_public,duration_seconds,language,public_summary,editorial_context_public,embargo_until,publication_status').eq('archive_item_id', item.id).maybeSingle(),
    db.from('comun_archive_oral_history_participants').select('id,participant_role,public_name,preferred_identification,biography_public,is_minor,participation_status,position').eq('oral_history_item_id', item.id).neq('participation_status', 'withdrawn').order('position'),
    db.from('comun_archive_oral_history_consents').select('participant_id,consent_status,allow_preservation_private,allow_internal_transcription,allow_public_transcript,allow_public_audio_excerpt,allow_public_full_audio,allow_public_image,allow_public_name,allow_download,guardian_consent,valid_from,valid_until').eq('oral_history_item_id', item.id),
    db.from('comun_archive_oral_history_transcript_versions').select('id,transcript_type,content,language,status,contains_redactions,version_number').eq('oral_history_item_id', item.id).eq('status', 'approved').order('version_number', { ascending: false }),
    db.from('comun_archive_oral_history_segments').select('id,start_seconds,end_seconds,speaker_label,public_text,sensitivity,publication_status').eq('oral_history_item_id', item.id).eq('publication_status', 'approved_public').order('start_seconds'),
    db.from('comun_archive_assets').select('id,asset_role,bucket_scope,public_url,mime_type,duration_seconds,alt_text,credits,review_status').eq('archive_item_id', item.id).eq('bucket_scope', 'public_safe').eq('review_status', 'approved'),
    db.from('comun_archive_collection_items').select('position,comun_archive_collections!inner(slug,title,status)').eq('archive_item_id', item.id),
    db.from('comun_archive_relations').select('relation_type,public_note,target_item_id,comun_archive_items!comun_archive_relations_target_item_id_fkey(slug,title,item_type,status,visibility)').eq('source_item_id', item.id).is('internal_note', null),
  ]);
  if (!history.data || history.data.publication_status !== 'published' || embargoIsActive(history.data.embargo_until)) return null;
  const consentRows = (consents.data ?? []) as Array<OralConsent & { participant_id: string }>;
  const interviewees = (participants.data ?? []).filter((p) => p.participant_role === 'interviewee');
  if (!interviewees.length || interviewees.some((p) => !consentRows.find((c) => c.participant_id === p.id)?.allow_public_transcript)) return null;
  const transcript = (transcripts.data ?? []).find((t) => canExposeTranscript(t.transcript_type, t.status));
  const publicParticipants = (participants.data ?? []).map((participant) => ({ ...participant, display_name: publicParticipantName(participant, consentRows.find((c) => c.participant_id === participant.id)) }));
  const audio = (assets.data ?? []).filter((asset) => interviewees.every((p) => { const consent = consentRows.find((c) => c.participant_id === p.id); return consent ? canExposeAudio(asset.asset_role, asset.bucket_scope, asset.review_status, consent) : false; })).map((asset) => ({ ...asset, allow_download: interviewees.every((p) => consentRows.find((c) => c.participant_id === p.id)?.allow_download) }));
  return { item, history: history.data, participants: publicParticipants, transcript, segments: segments.data ?? [], audio, collections: collections.data ?? [], relations: relations.data ?? [] };
}
