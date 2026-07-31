export const COMUN_SECURITY_RESILIENCE = {
  result: "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
  evidenceAt: "2026-07-30",
  state: "Recuperação implementada; ponto durável de backup indisponível",
  nextAction:
    "Executar o ensaio isolado e manter o domínio bloqueado até existir um ponto durável de recuperação compatível com o RPO.",
  checks: [
    ["RLS e grants", "ready"],
    ["Fronteira de segredos", "ready"],
    ["Backup remoto durável", "blocked"],
    ["Restore do banco", "pending"],
    ["Restore de arquivos", "pending"],
    ["Retenção e exclusão", "ready"],
    ["Resposta a incidentes", "ready"],
    ["Rollback", "ready"],
  ],
} as const;
