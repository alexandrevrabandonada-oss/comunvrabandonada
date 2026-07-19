const labels: Record<string, string> = {
  received: "Recebido", pending: "Em revisão", under_review: "Em revisão", needs_more_info: "Precisa de complemento",
  verified: "Verificado", published: "Publicado", organizing: "Em construção", building_solution: "Em construção",
  confirmed: "Em ação", in_progress: "Em ação", awaiting_response: "Aguardando resposta", response_received: "Resposta recebida",
  result_recorded: "Resultado registrado", completed: "Concluído", preserved: "Preservado na memória", archived: "Preservado na memória",
  open: "Próxima ação", blocked: "Precisa de resposta", pending_review: "Em revisão", accepted: "Verificado", rejected: "Concluído",
};

export function communityStatusLabel(value: unknown) {
  const status = String(value ?? "").trim().toLowerCase();
  return labels[status] ?? (status.replaceAll("_", " ") || "Em andamento");
}

export function communityStatusPriority(value: unknown) {
  const status = String(value ?? "").trim().toLowerCase();
  if (["urgent", "needs_more_info", "blocked", "attention"].includes(status)) return 5;
  if (["awaiting_response", "pending", "under_review", "pending_review"].includes(status)) return 4;
  if (["open", "confirmed", "organizing", "building_solution"].includes(status)) return 3;
  if (["in_progress", "response_received", "verified", "published"].includes(status)) return 2;
  return 1;
}
