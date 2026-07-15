import { describe, expect, it } from 'vitest';
import { campaignCoverage, validateCampaignFieldObservation } from './observation-campaign-rules';
describe('regras de campanha', () => {
 it('rejeita combinações temporais impossíveis e apenas sinaliza janela longa', () => { expect(validateCampaignFieldObservation({observedTime:'10:00',arrivalTime:'09:59'}).ok).toBe(false); expect(validateCampaignFieldObservation({observedTime:'10:00',arrivalTime:'14:30'}).flags).toContain('long_observation_window'); });
 it('sinaliza serviço não realizado com chegada ou qualidade', () => { const v=validateCampaignFieldObservation({observedTime:'10:00',arrivalTime:'10:10',skippedService:true,quality:{crowding:'cheio'}}); expect(v.flags).toEqual(expect.arrayContaining(['skipped_with_arrival','quality_without_vehicle'])); });
 it('mede cobertura sem confundir com qualidade', () => { const value=campaignCoverage([{id:'a',status:'completed',target_observations:2,minimum_observations:1,monitored_entity_id:'line',target_at:'2026-07-15T10:00:00Z'}],[{sampling_slot_id:'a',monitored_entity_id:'line',occurred_at:'2026-07-15T10:05:00Z',status:'accepted'}]); expect(value).toMatchObject({plannedSlots:1,completedSlots:1,slotsMeetingMinimum:1,acceptedObservations:1,targetProgress:50}); });
});
