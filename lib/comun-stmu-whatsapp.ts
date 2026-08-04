export const STMU_WHATSAPP_CHANNEL = {
  id: "vr-stmu-whatsapp",
  adapterId: "vr-stmu-whatsapp-complaint-v1",
  name: "WhatsApp de Ônibus — STMU/STPP Volta Redonda",
  number: "+55 24 99295-8558",
  officialUrl: "https://wa.me/5524992958558",
  state: "menu_operational_complaint_flow_pending",
  reviewedAt: "2026-08-04",
  sourceVersion: "stmu-whatsapp-human-live-observation-v1",
  serviceHours: "segunda a sexta-feira, das 8h às 17h",
  responseExpectation: "A STMU informa expectativa de retorno em 72 horas em fontes oficiais; esse prazo ainda não foi confirmado no fluxo do WhatsApp.",
} as const;

export const STMU_COMPLAINT_CATEGORIES = [
  "observed_delay", "not_observed_during_session", "passed_without_stopping",
  "overcrowding", "accessibility_failure", "vehicle_condition",
  "route_or_timetable_information", "staff_conduct_private",
] as const;

export const STMU_REQUIREMENTS = [
  { key: "name", label: "Nome", source: "live_menu", requiredStatus: "confirmed_required", liveConfirmed: true, sensitive: true },
  { key: "line", label: "Linha", source: "carta_211", requiredStatus: "source_declared", liveConfirmed: false, sensitive: false },
  { key: "direction", label: "Sentido", source: "comun_structured_observation", requiredStatus: "optional", liveConfirmed: false, sensitive: false },
  { key: "location_reference", label: "Local ou ponto", source: "carta_211", requiredStatus: "source_declared", liveConfirmed: false, sensitive: false },
  { key: "observed_at", label: "Data e horário", source: "carta_211", requiredStatus: "source_declared", liveConfirmed: false, sensitive: false },
  { key: "vehicle_order", label: "Número de ordem do veículo", source: "carta_211", requiredStatus: "optional", liveConfirmed: false, sensitive: false },
  { key: "institutional_text_confirmation", label: "Revisar mensagem", source: "comun_consent", requiredStatus: "confirmed_required", liveConfirmed: true, sensitive: false },
] as const;

export function validateStmuDestination(raw: string) {
  try {
    const url = new URL(raw);
    const allowed = new URL(STMU_WHATSAPP_CHANNEL.officialUrl);
    return { valid: url.protocol === "https:" && url.hostname === allowed.hostname && url.pathname === allowed.pathname && !url.search && !url.hash, url: url.toString() };
  } catch { return { valid: false, url: raw }; }
}

export function buildStmuComplaintMessage(input: { name?: string; line?: string; direction?: string; location?: string; observedAt?: string; vehicleOrder?: string; occurrence?: string; description?: string; comunProtocol?: string }) {
  const value = (v: string | undefined, fallback = "não informado") => v?.trim() || fallback;
  return [
    "Olá. Gostaria de registrar uma reclamação sobre o transporte coletivo.", "",
    `Nome:`, value(input.name, "[nome informado privadamente]"), "",
    `Linha:`, value(input.line), `Sentido:`, value(input.direction),
    `Local:`, value(input.location), `Data e horário:`, value(input.observedAt),
    `Número de ordem do veículo:`, value(input.vehicleOrder, "não observado"),
    `Ocorrência:`, value(input.occurrence), `Descrição:`, value(input.description),
    input.comunProtocol ? `Protocolo COMUN (interno): ${input.comunProtocol}` : "",
    "", "Solicito, por favor, o registro da reclamação e o número de protocolo.",
  ].filter(Boolean).join("\n");
}
