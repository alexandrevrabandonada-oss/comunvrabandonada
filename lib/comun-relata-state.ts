import type { RelataStatus } from "./comun-relata-contract";

const ALLOWED_TRANSITIONS: Record<RelataStatus, readonly RelataStatus[]> = {
  captured_private: ["stored_private", "withdrawn"],
  draft: ["triage", "withdrawn"],
  triage: ["awaiting_person", "routed", "withdrawn"],
  awaiting_person: ["triage", "routed", "withdrawn"],
  routed: ["stored_private", "withdrawn"],
  stored_private: ["withdrawn"],
  withdrawn: [],
};

export function canTransitionRelata(from: RelataStatus, to: RelataStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertRelataTransition(from: RelataStatus, to: RelataStatus) {
  if (!canTransitionRelata(from, to)) {
    throw new Error("COMUN_RELATA_INVALID_STATE_TRANSITION");
  }
}
