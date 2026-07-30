export type ComunLaunchDomainStatus =
  "green" | "in_progress" | "blocked" | "evidence_required";

export type ComunLaunchDomain = {
  id: string;
  label: string;
  status: ComunLaunchDomainStatus;
  objective: string;
  requiredEvidence: string[];
  nextTijolo: string;
  href?: string;
};

export const COMUN_V1_LAUNCH_PROGRAM = {
  version: "2026.07",
  name: "COMUN V1 entregável",
  finalResult: "COMUN_V1_PUBLIC_LAUNCH_READY",
  finalHumanGate: "launch_publicly",
  policy:
    "Nenhuma abertura pública integral acontece enquanto existir domínio bloqueado, evidência obrigatória ausente ou finding crítico não contido.",
  domains: [
    {
      id: "public_core",
      label: "Núcleo público e navegação",
      status: "in_progress",
      objective:
        "Home, exploração, busca, territórios e navegação precisam formar uma jornada coerente sem conta.",
      requiredEvidence: [
        "rotas públicas críticas respondendo 200",
        "nenhum placeholder ou aviso demonstrativo em superfície pública",
        "busca, compartilhamento e navegação mobile verificadas",
      ],
      nextTijolo: "47.2 — Núcleo público sem placeholders",
      href: "/comun",
    },
    {
      id: "identity_communities",
      label: "Identidade e comunidades",
      status: "blocked",
      objective:
        "Conta, vínculo comunitário, solicitação moderada, papéis e grupos precisam funcionar de ponta a ponta.",
      requiredEvidence: [
        "solicitação e aprovação de comunidade moderada",
        "administração de papéis e grupos",
        "publicadores comunitários da Inbox conectados",
        "matriz negativa de autorização",
      ],
      nextTijolo: "47.3 — Comunidades completas",
      href: "/comun/admin/organizacao",
    },
    {
      id: "pauta_action_cycle",
      label: "Ciclo de pauta e ação coletiva",
      status: "evidence_required",
      objective:
        "Relato, roda, síntese, tarefa, ação, protocolo, resposta e resultado devem formar um único processo acompanhável.",
      requiredEvidence: [
        "ensaio integral autenticado em produção controlada",
        "protocolo e resposta oficial vinculados",
        "resultado separado de atividade",
        "histórico público coerente",
      ],
      nextTijolo: "47.4 — Esteira política completa",
      href: "/comun/admin/pautas",
    },
    {
      id: "miniapps",
      label: "Miniapps territoriais",
      status: "in_progress",
      objective:
        "O Mapa das Calçadas deve ser o miniapp completo da V1 e o motor reutilizável precisa ficar documentado.",
      requiredEvidence: [
        "piloto territorial concluído",
        "moderação dentro do SLA",
        "acompanhamento e resolução de registros",
        "contrato reutilizável extraído",
      ],
      nextTijolo: "47.5 — Fechamento do motor de miniapps",
      href: "/comun/admin/calcadas/piloto",
    },
    {
      id: "archive_radio_art",
      label: "Acervo, rádio e arte territorial",
      status: "evidence_required",
      objective:
        "Cada frente precisa entregar uma experiência mínima real, moderada, acessível e ligada às pautas.",
      requiredEvidence: [
        "conteúdo inicial real e autorizado",
        "upload, processamento e publicação moderada",
        "transcrição e acessibilidade quando aplicável",
        "proveniência e direitos preservados",
      ],
      nextTijolo: "47.6 — Memória e cultura entregáveis",
      href: "/comun/admin/acervo",
    },
    {
      id: "operations",
      label: "Operação, moderação e observabilidade",
      status: "in_progress",
      objective:
        "Fila, notificações, incidentes e responsabilidades precisam operar em uma superfície única.",
      requiredEvidence: [
        "cockpit unificado por prioridade",
        "SLA e escalonamento definidos",
        "alertas sem duplicação",
        "rotina diária reproduzível",
      ],
      nextTijolo: "47.7 — Central operacional unificada",
      href: "/comun/admin/organizacao",
    },
    {
      id: "security_resilience",
      label: "Segurança, privacidade e recuperação",
      status: "blocked",
      objective:
        "RLS, backups, restore, retenção, segredos e resposta a incidentes precisam ter evidência recente.",
      requiredEvidence: [
        "matriz RLS completa",
        "backup e restore ensaiados",
        "política de retenção e exclusão",
        "runbook de incidente e rollback",
      ],
      nextTijolo: "47.8 — Resiliência operacional",
      href: "/comun/admin/auditoria",
    },
    {
      id: "quality_performance",
      label: "Acessibilidade, PWA e performance",
      status: "blocked",
      objective:
        "A experiência precisa ser utilizável em mobile popular, conexão ruim, teclado e leitores de tela.",
      requiredEvidence: [
        "matriz residual PWA e autenticação",
        "Axe e visual nas jornadas centrais",
        "carga representativa 25/50/100 materializando itens",
        "orçamentos de performance cumpridos",
      ],
      nextTijolo: "47.9 — Qualidade integral",
      href: "/comun/admin/observabilidade",
    },
    {
      id: "content_governance",
      label: "Conteúdo, ajuda e governança",
      status: "blocked",
      objective:
        "A plataforma precisa explicar como participar, como decisões são tomadas e o que acontece com cada contribuição.",
      requiredEvidence: [
        "conteúdo inicial sem fixtures públicas",
        "ajuda e onboarding revisados",
        "normas comunitárias e política editorial",
        "privacidade, termos e canais de contato",
      ],
      nextTijolo: "47.10 — Conteúdo e governança de lançamento",
      href: "/comun/seguranca",
    },
    {
      id: "launch_rehearsal",
      label: "Ensaio fechado e lançamento",
      status: "blocked",
      objective:
        "Um grupo fechado precisa atravessar as jornadas centrais antes da abertura integral.",
      requiredEvidence: [
        "ensaio fechado com pessoas reais",
        "blockers P0 e P1 encerrados",
        "monitoramento de 72 horas estável",
        "um único go/no-go final",
      ],
      nextTijolo: "47.11 — Ensaio geral e go/no-go",
      href: "/comun/admin/lancamento",
    },
  ] satisfies ComunLaunchDomain[],
} as const;

export function summarizeComunLaunchProgram(
  domains: readonly ComunLaunchDomain[] = COMUN_V1_LAUNCH_PROGRAM.domains,
) {
  const counts = {
    green: 0,
    inProgress: 0,
    blocked: 0,
    evidenceRequired: 0,
  };

  for (const domain of domains) {
    if (domain.status === "green") counts.green += 1;
    if (domain.status === "in_progress") counts.inProgress += 1;
    if (domain.status === "blocked") counts.blocked += 1;
    if (domain.status === "evidence_required") counts.evidenceRequired += 1;
  }

  return {
    counts,
    total: domains.length,
    readyForFinalHumanGate:
      counts.green === domains.length &&
      counts.blocked === 0 &&
      counts.evidenceRequired === 0 &&
      counts.inProgress === 0,
    remaining: counts.blocked + counts.evidenceRequired + counts.inProgress,
  };
}
