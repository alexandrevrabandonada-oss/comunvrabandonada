export type InboxContextInput = {
  notification_type: string;
  action_url: string;
  created_at: string;
  priority: string;
  pauta?: { title?: string | null; slug?: string | null } | null;
};

export function projectInboxContext(input: InboxContextInput) {
  const type = input.notification_type;
  const source =
    type.includes("sidewalk") || type.includes("calcada")
      ? ["Mapa das Calçadas", "registro"]
      : type.includes("transport")
        ? ["Transporte", "pauta"]
        : type.includes("archive") ||
            type.includes("identification") ||
            type.includes("artwork")
          ? ["Acervo", "contribuição"]
          : type.includes("community")
            ? ["Comunidade", "atividade"]
            : type.includes("result")
              ? ["Resultados", "resultado"]
              : ["COMUN", "atualização"];
  return {
    sourceLabel: source[0],
    entityType: source[1],
    entityRef: input.pauta?.title ?? null,
    destination: input.action_url,
    significance: input.priority,
    createdAt: input.created_at,
  };
}
