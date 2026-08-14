export const COMUN_EXPERIENCE_COHERENCE_RESULT =
  "COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL" as const;

export const COMUN_INTEGRATED_EXPERIENCE_RESULT =
  "COMUN_48_3_E1_INTEGRATED_EXPERIENCE_COHERENCE_GREEN_STREAMLINED_NAVIGATION" as const;

export const COMUN_PUBLIC_EXPERIENCE_DOORS = [
  {
    id: "report",
    label: "Vi um problema",
    description:
      "Registrar primeiro, sem precisar descobrir o órgão responsável.",
    href: "/comun/relatar",
  },
  {
    id: "understand",
    label: "Entender a cidade",
    description: "Começar pelo Panorama e aprofundar quando fizer sentido.",
    href: "/comun/observatorios/panorama",
  },
  {
    id: "participate",
    label: "Participar do que está acontecendo",
    description: "Encontrar uma questão coletiva e seu próximo passo.",
    href: "/comun/pautas",
  },
  {
    id: "my_participation",
    label: "Minha participação",
    description: "Retomar registros, conversas, ações e compromissos.",
    href: "/comun/minha-participacao",
  },
] as const;

export const COMUN_PUBLIC_LANGUAGE = {
  relata: { label: "Vi um problema", meaning: "Registrar o que aconteceu." },
  panorama: {
    label: "Entender a cidade",
    meaning: "Ler dados públicos com contexto e limites.",
  },
  pauta: {
    label: "Pauta",
    meaning: "Uma questão coletiva que queremos entender ou mudar.",
  },
  roda: {
    label: "Roda",
    meaning: "Uma conversa estruturada dentro de uma pauta.",
  },
  action: {
    label: "Ação",
    meaning: "Algo concreto que vamos fazer.",
  },
  memory: {
    label: "Memória",
    meaning: "O caminho da pauta e o que aconteceu.",
  },
} as const;

export const COMUN_PUBLIC_NAVIGATION_DESTINATIONS = [
  "/comun",
  "/comun/observatorios/panorama",
  "/comun/pautas",
  "/comun/minha-participacao",
] as const;

export const COMUN_EXPERIENCE_ROADMAP = [
  "47.9D — Ensaio humano, aparelhos reais e consolidação visual",
  "47.10 — Conteúdo, ajuda e governança",
  "47.11 — Ensaio geral e go/no-go",
] as const;

export const COMUN_EXPERIENCE_PARALLEL_TRACKS = [
  "47.8A — Redundância Durável Independente",
  "47.9B — Fechamento do provider de Busca Viva",
  "Calçadas",
  "Conteúdo cultural real",
] as const;

export const COMUN_APP_SHELL_V2_PILOTS = [
  "/comun",
  "/comun/explorar",
  "/comun/comunidades",
  "/comun/calcadas",
  "/comun/pautas/calcadas-em-circulacao",
  "/comun/minha-participacao",
  "/comun/admin/operacao",
] as const;

export const COMUN_EXPERIENCE_PRINCIPLES = [
  "A pessoa sabe onde está.",
  "Há uma ação principal por tela.",
  "Toda contribuição tem retorno.",
  "Nenhum estado é silencioso.",
  "Nenhum erro é beco sem saída.",
  "Público e privado são explicados.",
  "Comunidade, território e pauta mantêm contexto.",
  "Rotas preservam retorno.",
  "Componente equivalente mantém comportamento.",
  "Celular popular é referência.",
  "Conexão ruim é condição normal.",
  "Movimento é opcional.",
  "IA nunca substitui estrutura.",
  "Tendências servem ao projeto.",
  "Decisões políticas continuam humanas.",
] as const;

export const COMUN_CANONICAL_ACTIONS = [
  {
    term: "Participar",
    meaning: "Entrar em um processo coletivo e escolher uma forma de presença.",
  },
  {
    term: "Contribuir",
    meaning: "Enviar informação, evidência, relato ou conteúdo para revisão.",
  },
  {
    term: "Registrar",
    meaning: "Criar um registro estruturado ligado a território ou pauta.",
  },
  {
    term: "Acompanhar",
    meaning: "Ver estado, próxima ação e consequência de algo já iniciado.",
  },
  {
    term: "Seguir",
    meaning: "Receber atualizações de uma pauta sem assumir responsabilidade.",
  },
  {
    term: "Assumir tarefa",
    meaning: "Aceitar responsabilidade explícita por uma entrega.",
  },
  {
    term: "Solicitar entrada",
    meaning: "Pedir vínculo moderado com uma comunidade.",
  },
  {
    term: "Registrar resultado",
    meaning: "Documentar uma consequência com fonte e estado de verificação.",
  },
  {
    term: "Verificar resultado",
    meaning: "Confirmar evidência sem transformar atividade em conquista.",
  },
  {
    term: "Publicar",
    meaning: "Tornar uma projeção revisada visível em superfície pública.",
  },
  {
    term: "Retirar",
    meaning: "Despublicar ou remover conforme direitos, retenção e auditoria.",
  },
] as const;

export const COMUN_EXPRESSIVITY_LEVELS = {
  0: {
    name: "Calmo e preciso",
    surfaces: [
      "operação",
      "segurança",
      "privacidade",
      "protocolos",
      "formulários densos",
    ],
  },
  1: {
    name: "Expressivo contextual",
    surfaces: [
      "pautas",
      "comunidades",
      "ações",
      "Minha Participação",
      "Calçadas",
      "territórios",
      "resultados",
    ],
  },
  2: {
    name: "Expressivo cultural",
    surfaces: [
      "Home",
      "Acervo",
      "Rádio",
      "Arte",
      "memória",
      "celebração de resultados",
    ],
  },
} as const;

export const COMUN_EXPERIENCE_PILOTS = [
  { route: "/comun", level: 2, purpose: "descoberta sem feed" },
  {
    route: "/comun/pautas/calcadas-em-circulacao",
    level: 1,
    purpose: "contexto, próxima ação, retorno e estado",
  },
  {
    route: "/comun/admin/operacao",
    level: 0,
    purpose: "cuidado operacional sanitizado e previsível",
  },
] as const;

export type ComunExpressivityLevel = keyof typeof COMUN_EXPRESSIVITY_LEVELS;

export function isExperienceCoherencePilot(
  value: string | string[] | undefined,
) {
  return value === "coerencia";
}
