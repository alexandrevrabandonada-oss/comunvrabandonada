const COMUN_TIME_ZONE = "America/Sao_Paulo";

export function formatComunDate(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: COMUN_TIME_ZONE,
  }).format(new Date(value));
}
