/**
 * COMUN Editais R0: triagem local, determinística e conservadora.
 * Nenhuma função aqui acessa rede, persiste dados ou declara elegibilidade.
 * Texto de edital é dado não confiável, nunca instrução para o aplicativo.
 */
export const COMUN_EDITAIS_R0_FLAG = "COMUN_EDITAIS_R0_ENABLED";
export const MAX_EDITAL_R0_TEXT_LENGTH = 60_000;

export const EDITAIS_R0_CAPABILITIES = Object.freeze({
  canPersist: false,
  canApprove: false,
  canSubmit: false,
  canVerifyEligibility: false,
});

export function isComunEditaisR0Enabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[COMUN_EDITAIS_R0_FLAG] === "enabled";
}

export const EDITAIS_R0_CHECKLIST = [
  {
    id: "identity",
    title: "Identidade e documentação institucional",
    question: "Razão social, CNPJ, estatuto e documentos correspondem à entidade proponente?",
    markers: [/cnpj/i, /razão social/i, /estatuto/i],
  },
  {
    id: "representation",
    title: "Representação e poderes de assinatura",
    question: "A pessoa signatária tem mandato e autorização válidos?",
    markers: [/representante legal/i, /ata de eleição/i, /diretoria/i],
  },
  {
    id: "eligibility",
    title: "Elegibilidade da entidade",
    question: "A natureza, o território e o tempo de existência são compatíveis com todas as regras?",
    markers: [/organizaç(?:ão|ões) da sociedade civil/i, /sem fins lucrativos/i, /tempo de existência/i, /\bOSC\b/i],
  },
  {
    id: "regularity",
    title: "Certidões e regularidade",
    question: "Todas as certidões exigidas estão válidas na data pertinente?",
    markers: [/certid(?:ão|ões)/i, /regularidade fiscal/i, /\bfgts\b/i, /\binss\b/i],
  },
  {
    id: "experience",
    title: "Experiência e capacidade técnica",
    question: "Há comprovantes aceitos pelo edital para demonstrar execução prévia?",
    markers: [/portf[oó]lio/i, /experi[eê]ncia comprovada/i, /atestado/i, /capacidade técnica/i],
  },
  {
    id: "workplan",
    title: "Projeto e plano de trabalho",
    question: "Objetivo, justificativa, atividades, metas e indicadores seguem o modelo obrigatório?",
    markers: [/plano de trabalho/i, /metodologia/i, /indicadores?/i, /objetivos?/i],
  },
  {
    id: "budget",
    title: "Orçamento e contrapartidas",
    question: "Valores, rubricas, limites, contrapartidas e despesas vedadas foram conferidos?",
    markers: [/orçamento/i, /planilha de custos/i, /contrapartida/i, /despesas vedadas/i],
  },
  {
    id: "schedule",
    title: "Cronograma e prazo",
    question: "O prazo de inscrição, o fuso horário e as datas de execução foram comprovados na fonte?",
    markers: [/cronograma/i, /prazo de inscrição/i, /data limite/i, /vigência/i],
  },
  {
    id: "attachments",
    title: "Anexos e modelos obrigatórios",
    question: "Todos os anexos assinados e modelos oficiais estão identificados e conferidos?",
    markers: [/anexos?/i, /documentos obrigat[oó]rios/i, /formul[aá]rio/i],
  },
  {
    id: "submission",
    title: "Canal de inscrição e protocolo",
    question: "Foram identificados portal oficial, autenticação, etapas de envio e comprovante?",
    markers: [/inscriç(?:ão|ões)/i, /plataforma/i, /protocolo/i, /envio/i],
  },
] as const;

export type EditaisR0ChecklistId = (typeof EDITAIS_R0_CHECKLIST)[number]["id"];

export type EditaisR0Metadata = {
  organization: string;
  title: string;
  issuer: string;
  sourceUrl: string;
  deadline: string;
};

export type EditaisR0Evidence = Partial<Record<EditaisR0ChecklistId, string>>;

export function detectEditaisR0Mentions(text: unknown) {
  const source =
    typeof text === "string"
      ? text.slice(0, MAX_EDITAL_R0_TEXT_LENGTH).normalize("NFKC")
      : "";
  return EDITAIS_R0_CHECKLIST.map(({ id, title, question, markers }) => ({
    id,
    title,
    question,
    mentioned: markers.some((marker) => marker.test(source)),
  }));
}

function bounded(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "[PENDENTE DE CONFERÊNCIA]";
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : "[PENDENTE DE CONFERÊNCIA]";
}

/**
 * Gera material para revisão, jamais uma proposta concluída.
 * Evidência informada é uma referência a conferir, não validação documental.
 */
export function buildEditaisR0Preparation(
  metadata: EditaisR0Metadata,
  editalText: string,
  evidence: EditaisR0Evidence = {},
): string {
  const checklist = detectEditaisR0Mentions(editalText);
  return [
    "# COMUN Editais — Dossiê preliminar R0",
    "",
    "STATUS: RASCUNHO LOCAL — NÃO INSCRITO — NÃO ENVIADO — SEM PROTOCOLO",
    "ELEGIBILIDADE: INDETERMINADA (exige leitura integral e prova documental).",
    "ATENÇÃO: menções detectadas por palavras não comprovam exigências nem dispensa de exigências.",
    "",
    "## Identificação",
    "Organização declarada: " + bounded(metadata.organization, 160),
    "Edital: " + bounded(metadata.title, 200),
    "Órgão concedente: " + bounded(metadata.issuer, 160),
    "Fonte oficial a conferir: " + bounded(metadata.sourceUrl, 1000),
    "Data/prazo informado: " + bounded(metadata.deadline, 80),
    "",
    "## Checklist de verificação humana",
    ...checklist.flatMap((item, index) => [
      String(index + 1) + ". " + item.title,
      "   Menção no texto fornecido: " + (item.mentioned ? "SIM (indício, não confirmação)" : "NÃO LOCALIZADA (não significa dispensa)"),
      "   Verificação: " + item.question,
      "   Referência informada: " + bounded(evidence[item.id], 300),
    ]),
    "",
    "## Estrutura inicial de proposta — NÃO PREENCHIDA",
    "Objetivo geral: [PENDENTE DE REVISÃO]",
    "Justificativa e diagnóstico territorial: [PENDENTE DE REVISÃO]",
    "Público beneficiário: [PENDENTE DE REVISÃO]",
    "Metodologia e atividades: [PENDENTE DE REVISÃO]",
    "Metas e indicadores verificáveis: [PENDENTE DE REVISÃO]",
    "Equipe e responsabilidades: [PENDENTE DE REVISÃO]",
    "Cronograma de execução: [PENDENTE DE REVISÃO]",
    "Orçamento e memória de cálculo: [PENDENTE DE REVISÃO]",
    "Prestação de contas: [PENDENTE DE REVISÃO]",
    "",
    "## Condições para futura submissão",
    "Confirmar a íntegra, anexos e retificações na fonte oficial; comprovar elegibilidade;",
    "verificar documentos e assinatura; obter autorização expressa da organização;",
    "usar somente conector permitido pelo portal; preservar recibo/protocolo real.",
    "Esta versão não persiste dados, não faz upload, não acessa portais nem envia inscrições.",
  ].join("\n");
}
