export type FieldObservation = { observedTime: string; arrivalTime?: string | null; skippedService?: boolean; quality?: Record<string, string | undefined> };
export type SamplingSlot = { id: string; status: string; target_observations: number; minimum_observations: number; monitored_entity_id?: string | null; territory_id?: string | null; target_at: string };
export type CampaignObservation = { sampling_slot_id?: string | null; monitored_entity_id?: string | null; territory_id?: string | null; occurred_at: string; status: string };

const minutes = (value?: string | null) => { if (!value || !/^\d{2}:\d{2}$/.test(value)) return null; const [hours, mins] = value.split(':').map(Number); return hours * 60 + mins; };
export function validateCampaignFieldObservation(value: FieldObservation) {
  const flags: string[] = [];
  const observed = minutes(value.observedTime), arrival = minutes(value.arrivalTime);
  if (observed === null) flags.push('observed_time_invalid');
  if (arrival !== null && observed !== null && arrival < observed) flags.push('arrival_before_wait');
  if (value.skippedService && arrival !== null) flags.push('skipped_with_arrival');
  if (value.skippedService && Object.values(value.quality ?? {}).some((x) => x && x !== 'não_observado')) flags.push('quality_without_vehicle');
  if (!value.skippedService && arrival === null) flags.push('arrival_missing');
  if (arrival !== null && observed !== null && arrival - observed > 240) flags.push('long_observation_window');
  return { ok: !flags.some((x) => ['observed_time_invalid', 'arrival_before_wait', 'skipped_with_arrival'].includes(x)), flags };
}

export function campaignCoverage(slots: SamplingSlot[], observations: CampaignObservation[]) {
  const completed = slots.filter((slot) => slot.status === 'completed');
  const accepted = observations.filter((observation) => ['accepted', 'partially_accepted'].includes(observation.status));
  const bySlot = new Map<string, number>();
  for (const item of accepted) if (item.sampling_slot_id) bySlot.set(item.sampling_slot_id, (bySlot.get(item.sampling_slot_id) ?? 0) + 1);
  const metMinimum = slots.filter((slot) => (bySlot.get(slot.id) ?? 0) >= slot.minimum_observations);
  const target = slots.reduce((sum, slot) => sum + slot.target_observations, 0);
  const entityCounts: Record<string, number> = {}, territoryCounts: Record<string, number> = {}, dayCounts: Record<string, number> = {}, hourCounts: Record<string, number> = {};
  for (const observation of accepted) { const day = observation.occurred_at.slice(0, 10), hour = observation.occurred_at.slice(11, 13); if (observation.monitored_entity_id) entityCounts[observation.monitored_entity_id] = (entityCounts[observation.monitored_entity_id] ?? 0) + 1; if (observation.territory_id) territoryCounts[observation.territory_id] = (territoryCounts[observation.territory_id] ?? 0) + 1; dayCounts[day] = (dayCounts[day] ?? 0) + 1; hourCounts[hour] = (hourCounts[hour] ?? 0) + 1; }
  const concentration = (values: Record<string, number>) => { const total = Object.values(values).reduce((a,b) => a+b, 0); const largest = Math.max(0, ...Object.values(values)); return total ? Math.round((largest / total) * 100) : 0; };
  return { plannedSlots: slots.length, completedSlots: completed.length, slotsMeetingMinimum: metMinimum.length, acceptedObservations: accepted.length, targetObservations: target, targetProgress: target ? Math.round((accepted.length / target) * 100) : 0, entities: entityCounts, territories: territoryCounts, dates: dayCounts, hours: hourCounts, concentration: { entity: concentration(entityCounts), territory: concentration(territoryCounts), date: concentration(dayCounts), hour: concentration(hourCounts) } };
}

export function coveragePublicText(value: ReturnType<typeof campaignCoverage>) { return `${value.acceptedObservations}/${value.targetObservations} observações revisadas; ${value.slotsMeetingMinimum}/${value.plannedSlots} turnos atingiram a amostra mínima. Concentração máxima: ${value.concentration.entity}% por entidade e ${value.concentration.hour}% por faixa horária.`; }
