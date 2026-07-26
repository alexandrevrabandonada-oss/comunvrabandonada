export const collectiveActionsPreviewFixtures = [
  {
    id: "preview-open", slug: "mutirao-caminho-seguro", title: "Mutirão pelo caminho seguro", summary: "Uma ação sintética de demonstração, sem dados reais.", objective: "Organizar uma caminhada coletiva para registrar barreiras e construir próximos passos.", action_type: "community_inspection", status: "open", territory_label: "Território demonstração", meeting_place: "Praça de demonstração", starts_at: "2026-08-02T13:00:00Z", participation_mode: "hybrid", tasks: [{ id: "preview-task", title: "Fotografar pontos críticos", description: "Registrar a caminhada sem expor pessoas.", desired_count: 2, assumed_count: 1, state: "open", effort_level: "small", participation_mode: "in_person", due_at: "2026-08-01T18:00:00Z" }], updates: [{ id: "preview-update", update_type: "announcement", title: "Ação confirmada", public_summary: "As tarefas estão abertas para participação.", occurred_at: "2026-07-26T12:00:00Z" }], sidewalkRecords: [], counts: { interested: 8, participating: 5, tasksAssumed: 1, updates: 1, results: 0 }, pauta: null, community: null,
  },
  {
    id: "preview-completed", slug: "memoria-do-mutirao", title: "Memória do mutirão", summary: "Uma ação concluída sintética para auditoria visual.", objective: "Reunir aprendizados do cuidado coletivo no território.", action_type: "mutual_aid", status: "completed", territory_label: "Território demonstração", meeting_place: null, starts_at: "2026-07-10T13:00:00Z", participation_mode: "in_person", tasks: [], updates: [{ id: "preview-memory", update_type: "memory", title: "Aprendizados preservados", public_summary: "A memória mantém o objetivo, o resultado e os próximos desdobramentos.", occurred_at: "2026-07-12T12:00:00Z" }], sidewalkRecords: [], counts: { interested: 12, participating: 9, tasksAssumed: 4, updates: 1, results: 1 }, pauta: null, community: null, result_summary: "O grupo registrou os pontos prioritários e combinou um novo encontro.", memory_summary: "Aprendemos que tarefas pequenas e retorno público facilitam a participação.", completed_at: "2026-07-12T12:00:00Z",
  },
] as const;

export function getCollectiveActionsPreviewFixture(slug: string) {
  return collectiveActionsPreviewFixtures.find((action) => action.slug === slug) ?? null;
}
