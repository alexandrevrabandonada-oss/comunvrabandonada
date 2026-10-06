import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const PILOT_ROLES = Object.freeze([
  "coordenacao",
  "contribuicoes",
  "privacidade",
  "direitos",
  "facilitacao",
  "protocolo",
  "resultados",
  "suporte_tecnico",
]);
const flags = [
  "primary_confirmed",
  "substitute_confirmed",
  "coverage_window_confirmed",
  "escalation_channel_confirmed",
  "training_confirmed",
  "access_reviewed",
];
const aliases = new Map([
  ["coordenacao_geral", "coordenacao"],
  ["revisao_de_contribuicoes", "contribuicoes"],
]);

function normalizeRole(role) {
  if (typeof role !== "string") return undefined;
  const normalized = role
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  return aliases.get(normalized) || normalized;
}

function isConfirmedDate(value, now) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      value,
    )
  )
    return false;
  const calendarDate = value.slice(0, 10);
  const calendarTime = Date.parse(`${calendarDate}T00:00:00Z`);
  const instant = Date.parse(value);
  return (
    Number.isFinite(calendarTime) &&
    new Date(calendarTime).toISOString().slice(0, 10) === calendarDate &&
    Number.isFinite(instant) &&
    instant <= now
  );
}

// Structural validation of human declarations; no identity or consent is inferred.
export function hasCompletePilotHumanReadiness(rows, now = Date.now()) {
  if (!Array.isArray(rows) || rows.length !== PILOT_ROLES.length) return false;
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return false;
    const role = normalizeRole(row.role);
    if (!PILOT_ROLES.includes(role) || seen.has(role)) return false;
    if (!flags.every((key) => row[key] === true)) return false;
    if (!isConfirmedDate(row.confirmed_at, now)) return false;
    if (
      typeof row.confirmed_by !== "string" ||
      !row.confirmed_by.trim() ||
      /^(todo|tbd|pendente|a definir)$/i.test(row.confirmed_by.trim())
    )
      return false;
    seen.add(role);
  }
  return seen.size === PILOT_ROLES.length;
}

export async function readPilotHumanReadiness() {
  try {
    return hasCompletePilotHumanReadiness(
      JSON.parse(
        await readFile(
          resolve(".local", "comun", "pilot-human-readiness.json"),
          "utf8",
        ),
      ),
    );
  } catch {
    return false;
  }
}
