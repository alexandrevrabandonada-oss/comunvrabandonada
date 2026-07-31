export const COMUN_CIVIC_INTELLIGENCE_MAXIMUM_WITHOUT_HUMANS =
  "COMUN_CIVIC_INTELLIGENCE_READY_FOR_CONTROLLED_REHEARSAL" as const;

export const COMUN_CIVIC_GROUNDED_ANSWERS_V1 = "disabled" as const;

export function evaluateCivicIntelligenceReadiness(input: {
  capability: boolean;
  realEmbeddings: boolean;
  relevance: boolean;
  permissionBoundary: boolean;
  technicalRehearsal: boolean;
  ci: boolean;
  production: boolean;
  humanRehearsal: boolean;
  criticalFindings: number;
}) {
  if (!input.capability || !input.realEmbeddings)
    return "COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY" as const;
  if (!input.permissionBoundary)
    return "COMUN_CIVIC_INTELLIGENCE_BLOCKED_PERMISSION_BOUNDARY" as const;
  if (!input.relevance)
    return "COMUN_CIVIC_INTELLIGENCE_BLOCKED_RELEVANCE" as const;
  if (!input.technicalRehearsal || !input.ci || !input.production)
    return "COMUN_CIVIC_INTELLIGENCE_BLOCKED_INCOMPLETE_EVIDENCE" as const;
  if (input.humanRehearsal && input.criticalFindings === 0)
    return "COMUN_CIVIC_INTELLIGENCE_GREEN" as const;
  return COMUN_CIVIC_INTELLIGENCE_MAXIMUM_WITHOUT_HUMANS;
}
