export const COMUN_BUS_ISSUE_TYPES = [
  "delay_or_not_passed",
  "overcrowding",
  "accessibility",
  "vehicle_condition",
  "stop_or_shelter",
  "conduct_or_service",
  "timetable_information",
  "other",
] as const;

export type ComunBusIssueType = (typeof COMUN_BUS_ISSUE_TYPES)[number];

export const COMUN_BUS_ISSUE_LABELS: Record<ComunBusIssueType, string> = {
  delay_or_not_passed: "Ônibus atrasado ou não passou",
  overcrowding: "Lotação",
  accessibility: "Acessibilidade",
  vehicle_condition: "Problema no veículo",
  stop_or_shelter: "Problema no ponto ou abrigo",
  conduct_or_service: "Condução ou atendimento",
  timetable_information: "Informação de horário",
  other: "Outro",
};

function clean(value: unknown, maximum = 80) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function isComunBusIssueType(value: unknown): value is ComunBusIssueType {
  return typeof value === "string" && COMUN_BUS_ISSUE_TYPES.includes(value as ComunBusIssueType);
}

export function buildCanonicalBusRelataText(input: {
  issueType: ComunBusIssueType;
  lineLabel?: string;
  direction?: string;
  vehicleOrder?: string;
  description?: string;
}) {
  const parts = [`Problema no transporte coletivo: ${COMUN_BUS_ISSUE_LABELS[input.issueType]}.`];
  const line = clean(input.lineLabel);
  const direction = clean(input.direction);
  const vehicle = clean(input.vehicleOrder);
  const description = clean(input.description, 300);
  if (line) parts.push(`Linha: ${line}.`);
  if (direction) parts.push(`Sentido: ${direction}.`);
  if (vehicle) parts.push(`Número de ordem: ${vehicle}.`);
  if (description) parts.push(`Descrição: ${description}`);
  return parts.join(" ").slice(0, 600);
}
