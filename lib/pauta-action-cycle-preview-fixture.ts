export const pautaActionCyclePreviewFixture = {
  currentStage: "memory",
  nextAction: "Acompanhar a execução e reabrir se a evidência mudar.",
  blockingReason: null,
  responsibleRole: "coordinator",
  lastTransitionAt: "2026-07-30T12:00:00Z",
  memoryPublishedAt: "2026-07-30T12:00:00Z",
  decision: {
    public_title: "Priorizar o caminho seguro",
    public_summary:
      "A comunidade decidiu organizar uma ação coletiva e acompanhar o encaminhamento.",
    public_justification:
      "A síntese revisada reuniu relatos e evidências públicas convergentes.",
  },
  action: {
    slug: "mutirao-caminho-seguro",
    title: "Mutirão pelo caminho seguro",
    summary:
      "Tarefas pequenas organizaram a vistoria e o acompanhamento coletivo.",
    status: "completed",
  },
  protocol: {
    comun_protocol: "COMUN-DEMO-47",
    official_protocol_number: "DEMO-47-4",
    status: "response_received",
    public_summary:
      "Uma resposta sintética foi resumida e verificada no território.",
  },
  result: {
    title: "Resultado verificado",
    result_type: "partial_change",
    public_summary:
      "A atividade foi concluída e o resultado foi verificado separadamente.",
    verification_status: "verified",
  },
  timeline: [
    {
      id: "preview-moderation",
      from_stage: "contribution",
      to_stage: "moderation",
      public_summary: "As contribuições foram revisadas sem expor originais.",
      state_version: 2,
      occurred_at: "2026-07-20T12:00:00Z",
    },
    {
      id: "preview-decision",
      from_stage: "synthesis",
      to_stage: "decision",
      public_summary: "A decisão foi publicada após dupla revisão.",
      state_version: 5,
      occurred_at: "2026-07-24T12:00:00Z",
    },
    {
      id: "preview-result",
      from_stage: "response",
      to_stage: "result",
      public_summary:
        "A resposta não virou vitória automaticamente; o resultado foi verificado.",
      state_version: 11,
      occurred_at: "2026-07-29T12:00:00Z",
    },
    {
      id: "preview-memory",
      from_stage: "result",
      to_stage: "memory",
      public_summary: "A memória revisada preservou o caminho político.",
      state_version: 12,
      occurred_at: "2026-07-30T12:00:00Z",
    },
  ],
} as const;
