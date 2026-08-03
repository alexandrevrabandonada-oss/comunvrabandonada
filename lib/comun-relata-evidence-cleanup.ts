export type RelataEvidenceCleanupRecord = {
  state:
    | "quarantine"
    | "validating"
    | "sealed_private"
    | "rejected"
    | "orphaned"
    | "withdrawn";
  reviewAfter: string;
};

export function isComunRelataEvidenceCleanupCandidate(
  record: RelataEvidenceCleanupRecord,
  now: Date,
) {
  if (new Date(record.reviewAfter).getTime() > now.getTime()) return false;
  return ["quarantine", "validating", "rejected", "orphaned", "withdrawn"].includes(
    record.state,
  );
}
export function sanitizeComunRelataEvidenceCleanupCounts(
  records: RelataEvidenceCleanupRecord[],
  now: Date,
) {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!isComunRelataEvidenceCleanupCandidate(record, now)) continue;
    counts.set(record.state, (counts.get(record.state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([state, count]) => ({ state, count }));
}
