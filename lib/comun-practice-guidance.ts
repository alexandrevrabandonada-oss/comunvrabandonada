import { withComunAppV2 } from "./comun-experience";

// Public learning material, not a second progress or task system.
export const participationGuidance = {
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
