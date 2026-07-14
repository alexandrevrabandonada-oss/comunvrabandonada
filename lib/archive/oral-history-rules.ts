export type OralConsent = {
  consent_status: string;
  allow_preservation_private: boolean;
  allow_internal_transcription: boolean;
  allow_public_transcript: boolean;
  allow_public_audio_excerpt: boolean;
  allow_public_full_audio: boolean;
  allow_public_image: boolean;
  allow_public_name: boolean;
  allow_download: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  guardian_consent?: boolean;
};

export function consentIsActive(consent: OralConsent, now = new Date()) {
  if (!['granted', 'partially_granted'].includes(consent.consent_status)) return false;
  if (consent.valid_from && new Date(`${consent.valid_from}T00:00:00Z`) > now) return false;
  if (consent.valid_until && new Date(`${consent.valid_until}T23:59:59Z`) < now) return false;
  return true;
}

export function publicParticipantName(participant: { public_name?: string | null; preferred_identification: string; participant_role: string; participation_status: string; is_minor?: boolean }, consent?: OralConsent | null) {
  if (!consent || !consentIsActive(consent) || !consent.allow_public_name || participant.participation_status === 'withdrawn') return 'Entrevista anônima';
  if (participant.is_minor && !consent.guardian_consent) return 'Participante menor — identidade protegida';
  if (participant.preferred_identification === 'anonymous') return 'Entrevista anônima';
  if (participant.preferred_identification === 'role_only') return participant.participant_role === 'interviewee' ? 'Pessoa entrevistada' : participant.participant_role;
  return participant.public_name?.trim() || 'Entrevista anônima';
}

export function embargoIsActive(embargoUntil?: string | null, now = new Date()) {
  return Boolean(embargoUntil && new Date(embargoUntil) > now);
}

export function canPublishOralHistory(input: {
  publicationStatus: string;
  embargoUntil?: string | null;
  participants: ReadonlyArray<{ id: string; participant_role: string; participation_status: string; is_minor: boolean }>;
  consents: ReadonlyArray<OralConsent & { participant_id: string }>;
  hasApprovedPublicTranscript: boolean;
  hasRestrictedSegmentPending: boolean;
  hasPublicAudio: boolean;
  publicAudioKind?: 'excerpt' | 'full';
}) {
  const reasons: string[] = [];
  if (!['approved', 'published'].includes(input.publicationStatus)) reasons.push('workflow_not_approved');
  if (embargoIsActive(input.embargoUntil)) reasons.push('embargo_active');
  if (!input.hasApprovedPublicTranscript) reasons.push('public_transcript_missing');
  if (input.hasRestrictedSegmentPending) reasons.push('sensitive_review_pending');
  for (const participant of input.participants.filter((p) => p.participant_role === 'interviewee' && p.participation_status !== 'archived')) {
    const consent = input.consents.find((c) => c.participant_id === participant.id);
    if (!consent || !consentIsActive(consent)) reasons.push(`consent_invalid:${participant.id}`);
    else {
      if (!consent.allow_public_transcript) reasons.push(`public_transcript_denied:${participant.id}`);
      if (participant.is_minor && !consent.guardian_consent) reasons.push(`minor_guardian_consent_missing:${participant.id}`);
      if (input.hasPublicAudio && input.publicAudioKind === 'excerpt' && !consent.allow_public_audio_excerpt) reasons.push(`audio_excerpt_denied:${participant.id}`);
      if (input.hasPublicAudio && input.publicAudioKind === 'full' && !consent.allow_public_full_audio) reasons.push(`full_audio_denied:${participant.id}`);
    }
  }
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] };
}

const PRIVATE_KEYS = new Set(['private_name','contact_private','representative_contact_private','private_notes','recording_location_private','internal_summary','internal_text','editorial_note_private','object_key','permission_reference','consent_document_asset_id']);
export function sanitizeOralHistorySnapshot(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeOralHistorySnapshot);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !PRIVATE_KEYS.has(key)).map(([key, item]) => [key, sanitizeOralHistorySnapshot(item)]));
}

export function canExposeTranscript(type: string, status: string) {
  return ['public_edited', 'public_excerpt', 'accessibility_caption'].includes(type) && status === 'approved';
}

export function canExposeAudio(role: string, scope: string, reviewStatus: string, consent: OralConsent) {
  if (scope !== 'public_safe' || reviewStatus !== 'approved' || !consentIsActive(consent)) return false;
  return role === 'oral_history_public_audio_excerpt' ? consent.allow_public_audio_excerpt : role === 'oral_history_public_full_audio' && consent.allow_public_full_audio;
}
