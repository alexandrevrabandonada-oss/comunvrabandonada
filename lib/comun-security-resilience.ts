export const COMUN_SECURITY_RESILIENCE = {
  result: "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
  evidenceAt: "2026-07-31 01:49 BRT",
  state: "Restores ensaiados; recuperação durável indisponível no plano atual",
  nextAction:
    "Manter o domínio bloqueado até existir um ponto durável do banco e uma cópia secundária dos arquivos compatíveis com o RPO.",
  checks: [
    ["RLS e grants", "ready"],
    ["Fronteira de segredos", "ready"],
    ["Backup remoto efêmero", "ready"],
    ["Ponto de recuperação durável", "blocked"],
    ["Restore do banco", "ready"],
    ["Restore de arquivos", "ready"],
    ["Retenção e exclusão", "ready"],
    ["Resposta a incidentes", "ready"],
    ["Rollback", "ready"],
  ],
} as const;
