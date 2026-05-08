const labels: Record<string, string> = {
  received: "Recebido",
  under_review: "Em revisao",
  needs_more_info: "Precisa de informacao",
  sanitized: "Sanitizado",
  published: "Publicado",
  linked_to_issue: "Ligado a pauta",
  archived: "Arquivado",
  receiving_reports: "Recebendo relatos",
  checking: "Checando",
  became_post: "Virou post",
  preparing_dossier: "Preparando dossie",
  forwarded: "Encaminhado",
  monitoring: "Monitorando",
};

export function StatusLabel({ value }: { value: string }) {
  return (
    <span className="inline-flex w-fit border border-comun-black bg-comun-black px-2 py-1 text-xs font-black uppercase text-comun-yellow">
      {labels[value] ?? value}
    </span>
  );
}
