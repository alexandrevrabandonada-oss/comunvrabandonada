export type PilotGateInput = {
  adultParticipantsOnly: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'excluded';
  approvedTemplate: boolean;
  initialConsentActive: boolean;
  explanationComplete: boolean;
  fieldChecklistComplete: boolean;
  originalPrivate: boolean;
  checksumVerified: boolean;
  backupConfirmed: boolean;
  fidelityReviewApproved: boolean;
  riskReviewApproved: boolean;
  unresolvedThirdPartyClaims: number;
  finalConsentActive: boolean;
  participantApproval: 'pending' | 'approved' | 'partially_approved' | 'denied' | 'expired' | 'withdrawn';
};

export const REQUIRED_FIELD_CHECKS = [
  'project_identity_explained','purpose_explained','recording_authorized','device_checked',
  'adequate_space_confirmed','interruption_allowed','optional_questions_explained',
  'withdrawal_explained','contact_provided','backup_planned',
] as const;

export function canStartPilotRecording(input: Pick<PilotGateInput,'adultParticipantsOnly'|'riskLevel'|'approvedTemplate'|'initialConsentActive'|'explanationComplete'|'fieldChecklistComplete'>) {
  const reasons: string[] = [];
  if (!input.adultParticipantsOnly) reasons.push('adult_participants_only');
  if (!['low','moderate'].includes(input.riskLevel)) reasons.push('risk_out_of_pilot_scope');
  if (!input.approvedTemplate) reasons.push('approved_template_missing');
  if (!input.initialConsentActive) reasons.push('initial_consent_missing');
  if (!input.explanationComplete) reasons.push('explanation_incomplete');
  if (!input.fieldChecklistComplete) reasons.push('field_checklist_incomplete');
  return { allowed: reasons.length === 0, reasons };
}

export function canPublishPilot(input: PilotGateInput) {
  const reasons: string[] = [];
  if (!input.originalPrivate) reasons.push('original_not_private');
  if (!input.checksumVerified) reasons.push('checksum_missing');
  if (!input.backupConfirmed) reasons.push('backup_missing');
  if (!input.fidelityReviewApproved) reasons.push('fidelity_review_missing');
  if (!input.riskReviewApproved) reasons.push('risk_review_missing');
  if (input.unresolvedThirdPartyClaims > 0) reasons.push('third_party_review_pending');
  if (!input.finalConsentActive) reasons.push('final_consent_missing');
  if (!['approved','partially_approved'].includes(input.participantApproval)) reasons.push('participant_approval_missing');
  return { allowed: reasons.length === 0, reasons };
}

export function pilotSlo(stage: string, stageStartedAt: string, now = new Date()) {
  const limits: Record<string, number> = { contacted: 5, recorded: 1, original_preserved: 2, transcription: 21, review: 14, participant_approval: 7, withdrawn: 5 };
  const limitDays = limits[stage];
  if (!limitDays) return { state: 'not_applicable' as const, ageDays: 0, limitDays: null };
  const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(stageStartedAt).getTime()) / 86400000));
  return { state: ageDays > limitDays ? 'overdue' as const : 'healthy' as const, ageDays, limitDays };
}

export function sanitizedCustodyMetadata(value: Record<string, unknown>) {
  const forbidden = new Set(['object_key','url','location','contact','private_name']);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !forbidden.has(key)));
}
