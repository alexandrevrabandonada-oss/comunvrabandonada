export const SIDEWALK_PILOT = {
  id: "calcadas-vr-piloto-01",
  title: "Piloto territorial do Mapa das Calçadas",
  startAt: "2026-07-30T03:00:00.000Z",
  endAt: "2026-08-06T03:00:00.000Z",
  participantTarget: 15,
  recordTarget: 10,
  territoryTarget: 3,
  territories: ["Vila Rica/Tiradentes", "Retiro", "Santa Cruz"],
  completionTargetPct: 70,
  technicalFailureMaxPct: 5,
  moderationSlaHours: 24,
  returnTargetPct: 30,
} as const;

export type SidewalkPilotUploadRow = {
  member_user_id?: string | null;
  status: string;
  confirmation_state?: string | null;
  failure_code?: string | null;
  created_at: string;
  record_id?: string | null;
};

export type SidewalkPilotRecordRow = {
  id: string;
  status: string;
  visibility: string;
  created_at: string;
  updated_at?: string | null;
  inferred_neighborhood?: string | null;
};

export type SidewalkPilotPhotoRow = {
  record_id?: string | null;
  review_status: string;
  is_public: boolean;
};

export type SidewalkPilotInput = {
  uploads: SidewalkPilotUploadRow[];
  records: SidewalkPilotRecordRow[];
  photos: SidewalkPilotPhotoRow[];
};

const HOUR_MS = 3_600_000;

function timestamp(value: string | null | undefined) {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function withinWindow(value: string, start: number, end: number) {
  const parsed = timestamp(value);
  return parsed != null && parsed >= start && parsed < end;
}

function cleanNeighborhood(value: string | null | undefined) {
  const clean = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return clean || "Não inferido";
}

export function sidewalkPilotPhase(now = new Date()) {
  const current = now.getTime();
  const start = new Date(SIDEWALK_PILOT.startAt).getTime();
  const end = new Date(SIDEWALK_PILOT.endAt).getTime();
  if (current < start) return "preparing" as const;
  if (current >= end) return "closed" as const;
  return "active" as const;
}

export function summarizeSidewalkPilot(
  input: SidewalkPilotInput,
  now = new Date(),
) {
  const start = new Date(SIDEWALK_PILOT.startAt).getTime();
  const end = new Date(SIDEWALK_PILOT.endAt).getTime();
  const uploads = input.uploads.filter((row) =>
    withinWindow(row.created_at, start, end),
  );
  const records = input.records.filter((row) =>
    withinWindow(row.created_at, start, end),
  );
  const recordIds = new Set(records.map((row) => row.id));
  const photos = input.photos.filter(
    (row) => row.record_id && recordIds.has(row.record_id),
  );

  const confirmed = uploads.filter(
    (row) => row.status === "confirmed" && Boolean(row.record_id),
  );
  const participantIds = uploads
    .map((row) => row.member_user_id)
    .filter((value): value is string => Boolean(value));
  const uniqueParticipants = new Set(participantIds);
  const confirmedByParticipant = new Map<string, number>();
  for (const row of confirmed) {
    if (!row.member_user_id) continue;
    confirmedByParticipant.set(
      row.member_user_id,
      (confirmedByParticipant.get(row.member_user_id) ?? 0) + 1,
    );
  }
  const returningParticipants = Array.from(
    confirmedByParticipant.values(),
  ).filter((count) => count >= 2).length;

  const technicalFailures = uploads.filter(
    (row) =>
      Boolean(row.failure_code) &&
      !String(row.failure_code).startsWith("expired_cleanup"),
  );
  const decided = records.filter(
    (row) => !["pending", "under_review"].includes(row.status),
  );
  const published = records.filter(
    (row) => row.status === "published" && row.visibility === "public",
  );
  const moderationDurations = decided
    .map((row) => {
      const created = timestamp(row.created_at);
      const updated = timestamp(row.updated_at);
      return created != null && updated != null
        ? Math.max(0, (updated - created) / HOUR_MS)
        : null;
    })
    .filter((value): value is number => value != null);
  const moderationWithinSla = moderationDurations.filter(
    (hours) => hours <= SIDEWALK_PILOT.moderationSlaHours,
  ).length;
  const nowMs = now.getTime();
  const pending = records.filter((row) =>
    ["pending", "under_review"].includes(row.status),
  );
  const oldestPendingHours = pending.length
    ? Math.max(
        ...pending.map((row) => {
          const created = timestamp(row.created_at) ?? nowMs;
          return Math.max(0, (nowMs - created) / HOUR_MS);
        }),
      )
    : null;

  const neighborhoodCounts = new Map<string, number>();
  for (const record of records) {
    const label = cleanNeighborhood(record.inferred_neighborhood);
    neighborhoodCounts.set(label, (neighborhoodCounts.get(label) ?? 0) + 1);
  }
  const neighborhoods = Array.from(neighborhoodCounts, ([name, count]) => ({
    name,
    count,
  })).sort(
    (left, right) =>
      right.count - left.count || left.name.localeCompare(right.name),
  );

  const completionRatePct = percent(confirmed.length, uploads.length);
  const technicalFailureRatePct = percent(
    technicalFailures.length,
    uploads.length,
  );
  const moderationSlaPct = percent(
    moderationWithinSla,
    moderationDurations.length,
  );
  const returnRatePct = percent(returningParticipants, uniqueParticipants.size);
  const phase = sidewalkPilotPhase(now);
  const findings: string[] = [];
  if (
    phase === "active" &&
    uploads.length >= 3 &&
    completionRatePct < SIDEWALK_PILOT.completionTargetPct
  )
    findings.push("completion_below_target");
  if (
    phase === "active" &&
    technicalFailureRatePct > SIDEWALK_PILOT.technicalFailureMaxPct
  )
    findings.push("technical_failures_above_limit");
  if (
    phase === "active" &&
    oldestPendingHours != null &&
    oldestPendingHours > SIDEWALK_PILOT.moderationSlaHours
  )
    findings.push("moderation_queue_over_sla");

  return {
    pilot: SIDEWALK_PILOT,
    phase,
    metrics: {
      authorized: uploads.length,
      confirmed: confirmed.length,
      records: records.length,
      published: published.length,
      participants: uniqueParticipants.size,
      returningParticipants,
      completionRatePct,
      technicalFailures: technicalFailures.length,
      technicalFailureRatePct,
      moderationDecisions: decided.length,
      moderationWithinSla,
      moderationSlaPct,
      returnRatePct,
      pendingRecords: pending.length,
      pendingPhotos: photos.filter(
        (row) => row.review_status === "pending" && !row.is_public,
      ).length,
      oldestPendingHours,
      neighborhoods,
    },
    progress: {
      participantsPct: Math.min(
        100,
        percent(uniqueParticipants.size, SIDEWALK_PILOT.participantTarget),
      ),
      recordsPct: Math.min(
        100,
        percent(records.length, SIDEWALK_PILOT.recordTarget),
      ),
      territoriesReached: neighborhoods.filter(
        (item) => item.name !== "Não inferido",
      ).length,
    },
    findings,
    status: findings.length ? ("attention" as const) : ("green" as const),
  };
}

export function buildSidewalkPilotInviteUrl(territory: string) {
  const url = new URL("/comun/mapa/contribuir", "https://comunsocial.online");
  url.searchParams.set("origem", "calcadas");
  url.searchParams.set("pauta", "calcadas-em-circulacao");
  url.searchParams.set("piloto", SIDEWALK_PILOT.id);
  url.searchParams.set("bairro", cleanNeighborhood(territory));
  return url.toString();
}
