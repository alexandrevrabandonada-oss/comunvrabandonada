import { describe,expect,it } from 'vitest';
import { canPublishPilot,canStartPilotRecording,pilotSlo,sanitizedCustodyMetadata } from './oral-history-pilot-rules';

const ready={adultParticipantsOnly:true,riskLevel:'low' as const,approvedTemplate:true,initialConsentActive:true,explanationComplete:true,fieldChecklistComplete:true,originalPrivate:true,checksumVerified:true,backupConfirmed:true,fidelityReviewApproved:true,riskReviewApproved:true,unresolvedThirdPartyClaims:0,finalConsentActive:true,participantApproval:'approved' as const};
describe('governança do piloto de História Oral',()=>{
  it('bloqueia gravação com template retired/não aprovado',()=>expect(canStartPilotRecording({...ready,approvedTemplate:false}).reasons).toContain('approved_template_missing'));
  it('separa consentimento inicial do final',()=>expect(canPublishPilot({...ready,finalConsentActive:false}).reasons).toContain('final_consent_missing'));
  it('aceita aprovação parcial compatível e bloqueia expiração',()=>{expect(canPublishPilot({...ready,participantApproval:'partially_approved'}).allowed).toBe(true);expect(canPublishPilot({...ready,participantApproval:'expired'}).allowed).toBe(false)});
  it('bloqueia backup ausente e alegação pendente',()=>expect(canPublishPilot({...ready,backupConfirmed:false,unresolvedThirdPartyClaims:1}).reasons).toEqual(expect.arrayContaining(['backup_missing','third_party_review_pending'])));
  it('calcula SLO sem ranquear pessoas',()=>expect(pilotSlo('transcription','2026-01-01T00:00:00Z',new Date('2026-01-23T00:00:00Z')).state).toBe('overdue'));
  it('sanitiza snapshots de custódia',()=>expect(sanitizedCustodyMetadata({size:10,object_key:'segredo',url:'privada'})).toEqual({size:10}));
  it('bloqueia menores e risco alto no piloto',()=>expect(canStartPilotRecording({...ready,adultParticipantsOnly:false,riskLevel:'high'}).allowed).toBe(false));
  it('exige dupla revisão',()=>expect(canPublishPilot({...ready,fidelityReviewApproved:false,riskReviewApproved:false}).reasons).toEqual(expect.arrayContaining(['fidelity_review_missing','risk_review_missing'])));
});
