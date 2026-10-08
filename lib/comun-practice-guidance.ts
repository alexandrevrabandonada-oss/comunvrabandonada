import { withComunAppV2 } from "./comun-experience";

// Public learning material, not a second progress or task system.
export const participationGuidance = {
  pauta: {
    title: "Como ler e contribuir com esta pauta",
    summary:
      "Conheça o problema e o que já está documentado antes de escolher uma contribuição.",
    checks: [
      "Confira quem é afetado, as fontes e as datas. Separe observação, proposta e resultado comprovado.",
      "Veja o próximo passo e as lacunas publicadas. Se algo não estiver confirmado, mantenha a dúvida explícita e preserve dados pessoais.",
      "Você pode apenas acompanhar. Para contribuir, confira as condições no fluxo correspondente; ler esta pauta não inscreve você nem assume uma tarefa.",
    ],
    href: "/comun/pautas",
    action: "Consultar pautas e fontes",
  },
  participacao: {
    title: "Antes de participar desta ação",
    summary:
      "Escolha uma contribuição que caiba no seu tempo e nas suas condições.",
    checks: [
      "Confira o objetivo, o local ou canal e o tempo esperado.",
      "Veja quem orienta a atividade e qual apoio está disponível; se faltar informação, peça esclarecimento antes de assumir.",
      "Uma tarefa só é sua depois de você confirmar no fluxo correspondente. Consultar esta orientação não inscreve você.",
    ],
    href: "/comun/acoes",
    action: "Conhecer ações e condições",
  },
  resultado: {
    title: "O que esta ação mudou?",
    summary:
      "A conclusão de uma atividade não comprova, por si só, que o problema foi resolvido.",
    checks: [
      "Compare o objetivo com o resultado informado e confira fontes e datas.",
      "Distinga atividade realizada, resposta recebida e mudança demonstrada. Se faltar evidência, mantenha essa lacuna visível.",
      "Consulte os aprendizados e próximos passos publicados antes de decidir contribuir novamente.",
    ],
    href: "/comun/resultados",
    action: "Consultar resultados públicos",
  },
  registro: {
    title: "Registrar uma observação com cuidado",
    summary: "Separe o que você observou do que ainda precisa confirmar.",
    checks: [
      "Descreva o fato, quando ocorreu e o que você precisa entender.",
      "Não inclua nomes, contatos ou imagens de outras pessoas sem necessidade.",
      "Confira a privacidade e as opções do relato antes de confirmar.",
    ],
    href: "/comun/relatar",
    action: "Abrir um relato",
  },
  acompanhamento: {
    title: "Acompanhar sem confundir envio com resultado",
    summary:
      "Enviar um pedido é uma etapa. A resposta e o resultado precisam ser conferidos.",
    checks: [
      "Confira no registro o canal usado, a data e o estado informado.",
      "Consulte as instruções do canal sobre prazo e retorno; não suponha um prazo que não foi informado.",
      "Quando receber uma resposta, use as opções do próprio registro para guardá-la, se disponíveis.",
    ],
    href: "/comun/minha-participacao#meus-registros",
    action: "Voltar aos meus registros",
  },
  devolutiva: {
    title: "Conferir o que a resposta mudou",
    summary:
      "Uma resposta recebida não significa que o problema foi resolvido.",
    checks: [
      "Compare a resposta com o pedido e identifique o que foi atendido e o que permanece sem resposta.",
      "Guarde a fonte e a data nas opções disponíveis do registro; preserve dados pessoais.",
      "Se quiser ajudar numa ação, confira objetivo e condições antes de decidir participar.",
    ],
    href: "/comun/acoes",
    action: "Conhecer ações e condições",
  },
} as const;

export type ParticipationGuidanceStage = keyof typeof participationGuidance;

// Only states already exposed by public action readers receive guidance.
export function guidanceStageForPublicAction(
  status: unknown,
): ParticipationGuidanceStage | null {
  if (status === "open" || status === "active") return "participacao";
  if (status === "awaiting_result" || status === "completed")
    return "resultado";
  return null;
}

export function resolveParticipationGuidanceStage(
  value: unknown,
): ParticipationGuidanceStage | null {
  return typeof value === "string" &&
    Object.hasOwn(participationGuidance, value)
    ? (value as ParticipationGuidanceStage)
    : null;
}

export function guidanceStageForRecord(
  state: string,
): ParticipationGuidanceStage | null {
  if (
    [
      "captured_private",
      "Guardado",
      "ready_to_forward",
      "Pronto para encaminhar",
    ].includes(state)
  )
    return "registro";
  if (
    [
      "forwarding_prepared",
      "Encaminhamento preparado",
      "person_declared_sent",
      "Enviado por você",
      "waiting_response",
      "Aguardando retorno",
      "Acompanhando",
    ].includes(state)
  )
    return "acompanhamento";
  if (["responded", "Resposta registrada"].includes(state)) return "devolutiva";
  return null;
}

// Only a public, allowlisted phase crosses pages. No record handle or payload.
export function participationGuidanceHref(
  stage: ParticipationGuidanceStage,
  appV2 = true,
) {
  return withComunAppV2(`/comun/ajuda/primeira-acao?etapa=${stage}`, appV2);
}
