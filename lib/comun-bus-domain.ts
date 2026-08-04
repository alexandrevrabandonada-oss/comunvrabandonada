import { createHash, randomBytes } from "node:crypto";

export const BUS_DELAY_RULE_VERSION = "bus-delay-v1" as const;
export const BUS_OBSERVATORY_VERSION = "bus-observatory-v1" as const;

export const BUS_PROBLEM_KINDS = [
  "observed_delay", "not_observed_during_session", "passed_without_stopping",
  "overcrowding", "accessibility_failure", "vehicle_condition",
  "route_or_timetable_information", "staff_conduct_private",
] as const;
export type BusProblemKind = (typeof BUS_PROBLEM_KINDS)[number];

export const WAITING_EVENT_TYPES = [
  "bus_arrived", "passed_without_stopping", "user_cancelled",
  "observation_ended", "not_observed_during_session",
] as const;
export type WaitingEventType = (typeof WAITING_EVENT_TYPES)[number];

export function hashBusToken(token: string) {
  return createHash("sha256").update(`comun-bus-session-v1:${token}`).digest("hex");
}

export function createBusToken() { return randomBytes(24).toString("base64url"); }

export function parseTimeMinutes(value: string | null | undefined) {
  if (!value || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function differenceMinutes(expected: string | null | undefined, observed: Date | null | undefined) {
  if (!expected || !observed) return null;
  const expectedMinutes = parseTimeMinutes(expected);
  if (expectedMinutes === null) return null;
  const observedMinutes = observed.getHours() * 60 + observed.getMinutes();
  const candidates = [observedMinutes - expectedMinutes, observedMinutes + 1440 - expectedMinutes, observedMinutes - 1440 - expectedMinutes];
  return candidates.sort((a, b) => Math.abs(a) - Math.abs(b))[0];
}

export function classifyDifference(value: number | null, tolerance = 5) {
  if (value === null) return "not_calculable" as const;
  if (value < -tolerance) return "early" as const;
  if (value <= tolerance) return "on_time_window" as const;
  return "late" as const;
}

export function sanitizePreview(input: Record<string, unknown>) {
  return {
    line: typeof input.line === "string" ? input.line.slice(0, 80) : null,
    direction: typeof input.direction === "string" ? input.direction.slice(0, 100) : null,
    stop: typeof input.stop === "string" ? input.stop.slice(0, 120) : null,
    serviceDate: typeof input.serviceDate === "string" ? input.serviceDate.slice(0, 10) : null,
    officialTime: typeof input.officialTime === "string" ? input.officialTime.slice(0, 8) : null,
    observedTime: typeof input.observedTime === "string" ? input.observedTime.slice(0, 32) : null,
    differenceMinutes: typeof input.differenceMinutes === "number" ? input.differenceMinutes : null,
    problemKind: BUS_PROBLEM_KINDS.includes(input.problemKind as BusProblemKind) ? input.problemKind : null,
    requestProtocol: true,
    sentToStmu: false,
  };
}
