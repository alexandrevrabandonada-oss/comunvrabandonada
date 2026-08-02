"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { withComunAppV2 } from "@/lib/comun-shell-contract";
import {
  type ComunJourneyIntent,
  withComunJourneyContext,
} from "@/lib/comun-journey-context";

type Way = {
  title: string;
  href: string;
  time: string;
  account: string;
  purpose?: string;
  after?: string;
  note?: string;
  group?:
    | "Resolver um problema"
    | "Construir junto"
    | "Preservar memória e cultura"
    | "Corrigir ou proteger";
  intent?: ComunJourneyIntent;
};

const legacyMobileWays: Way[] = [
  {
    title: "Registrar uma calçada",
    href: "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
    time: "5–10 min",
    account: "Conta necessária",
    purpose: "Fotografar e avaliar um trecho.",
    after: "O registro segue para revisão antes de aparecer no mapa.",
  },
  {
    title: "Enviar relato",
    href: "/comun/relatar",
    time: "5–10 min",
    account: "Conta não obrigatória",
    purpose: "Contar um problema vivido no território.",
    after: "A equipe recebe o relato e informa os próximos passos possíveis.",
  },
  {
    title: "Contribuir com o Acervo",
    href: "/comun/acervo/contribuir",
    time: "10–30 min",
    account: "Conta opcional",
    purpose: "Compartilhar uma memória, identificação ou correção.",
    after: "A contribuição permanece em revisão editorial antes da publicação.",
  },
  {
    title: "Participar de roda",
    href: "/comun/pautas",
    time: "10–20 min",
    account: "Conforme a roda",
    purpose: "Ajudar a construir uma decisão coletiva.",
    after: "Sua participação integra a síntese moderada da pauta.",
  },
  {
    title: "Encontrar ação",
    href: "/comun/acoes",
    time: "Tempo indicado na ação",
    account: "Conforme a ação",
    purpose: "Descobrir uma atividade concreta para apoiar.",
    after:
      "A página da ação explica compromisso, responsável e acompanhamento.",
  },
];

const mobileWays: Way[] = [
  {
    title: "Registrar calçada",
    href: "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
    time: "5–10 min",
    account: "Conta necessária",
    purpose: "Fotografar e avaliar um trecho.",
    after: "O registro segue para revisão antes de aparecer no mapa.",
    group: "Resolver um problema",
    intent: "register_sidewalk",
  },
  {
    title: "Contribuir com pauta",
    href: "/comun/pautas",
    time: "5–20 min",
    account: "Conforme a pauta",
    purpose: "Enviar relato, evidência, proposta ou contraponto.",
    group: "Resolver um problema",
    intent: "contribute_pauta",
  },
  {
    title: "Enviar relato",
    href: "/comun/relatar",
    time: "5–10 min",
    account: "Conta não obrigatória",
    purpose: "Contar um problema vivido para triagem segura.",
    group: "Resolver um problema",
    intent: "send_report",
  },
  {
    title: "Registrar resposta institucional",
    href: "/comun/protocolos-oficiais",
    time: "5–15 min",
    account: "Conta necessária",
    purpose: "Relacionar uma resposta oficial a um processo acompanhado.",
    group: "Resolver um problema",
    intent: "institutional_response",
  },
  {
    title: "Entrar em comunidade",
    href: "/comun/comunidades",
    time: "2–5 min",
    account: "Conta necessária para solicitar vínculo",
    purpose: "Conhecer uma comunidade e pedir entrada moderada.",
    group: "Construir junto",
    intent: "join_community",
  },
  {
    title: "Assumir tarefa",
    href: "/comun/acoes",
    time: "Compromisso indicado na tarefa",
    account: "Conta necessária",
    purpose: "Aceitar responsabilidade explícita por uma entrega.",
    group: "Construir junto",
    intent: "take_task",
  },
  {
    title: "Participar de ação",
    href: "/comun/acoes",
    time: "Conforme a ação",
    account: "Conforme o compromisso",
    purpose: "Escolher uma atividade concreta e ver responsabilidades.",
    group: "Construir junto",
    intent: "join_action",
  },
  {
    title: "Acompanhar pauta",
    href: "/comun/pautas",
    time: "2 min",
    account: "Conta necessária",
    purpose: "Receber pedidos, decisões e resultados relevantes.",
    group: "Construir junto",
    intent: "follow_pauta",
  },
  {
    title: "Enviar item ao Acervo",
    href: "/comun/acervo/contribuir",
    time: "10–30 min",
    account: "Conta opcional",
    purpose: "Compartilhar uma memória para revisão editorial.",
    group: "Preservar memória e cultura",
    intent: "send_archive_item",
  },
  {
    title: "Enviar áudio à Rádio",
    href: "/comun/radio/contribuir",
    time: "10–20 min",
    account: "Conta opcional",
    purpose: "Propor áudio com consentimento e contexto.",
    group: "Preservar memória e cultura",
    intent: "send_radio_audio",
  },
  {
    title: "Enviar obra",
    href: "/comun/acervo/arte/contribuir",
    time: "10–30 min",
    account: "Conta opcional",
    purpose: "Enviar arte, crédito e contexto para revisão.",
    group: "Preservar memória e cultura",
    intent: "send_artwork",
  },
  {
    title: "Pedir correção",
    href: "/comun/acervo/direitos-e-remocao",
    time: "5–15 min",
    account: "Canal protegido",
    purpose: "Solicitar correção ou crédito sem expor dados pessoais.",
    group: "Corrigir ou proteger",
    intent: "request_correction",
  },
  {
    title: "Pedir retirada",
    href: "/comun/acervo/direitos-e-remocao",
    time: "5–15 min",
    account: "Canal protegido",
    purpose: "Pedir restrição ou retirada por um canal seguro.",
    group: "Corrigir ou proteger",
    intent: "request_withdrawal",
  },
  {
    title: "Relatar problema de privacidade",
    href: "/comun/seguranca",
    time: "5–15 min",
    account: "Canal protegido",
    purpose: "Entender o canal adequado para proteger dados e consentimento.",
    group: "Corrigir ou proteger",
    intent: "privacy_report",
  },
];

function contextualWays(path: string): Way[] {
  const generic: Way[] = [
    {
      title: "Contar um problema",
      href: "/comun/relatar",
      time: "5–10 min",
      account: "Conta não obrigatória",
    },
    {
      title: "Entrar numa roda",
      href: "/comun/pautas",
      time: "10–20 min",
      account: "Conta recomendada",
    },
    {
      title: "Ajudar numa ação",
      href: "/comun/acoes",
      time: "tempo indicado",
      account: "Conforme a ação",
    },
    {
      title: "Contribuir com memória",
      href: "/comun/acervo/contribuir",
      time: "10–30 min",
      account: "Conta opcional",
    },
  ];
  if (/calcad|\/mapa/.test(path))
    return [
      {
        title: "Registrar problema na calçada",
        href: `/comun/entrar?returnTo=${encodeURIComponent("/comun/mapa/contribuir")}`,
        time: "5–10 min",
        account: "Conta necessária",
        note: "Você volta ao formulário depois do acesso.",
      },
      {
        title: "Contribuir com evidência",
        href: "/comun/mapa/contribuir",
        time: "10 min",
        account: "Conforme o registro",
      },
      ...generic.slice(1, 3),
    ];
  if (path.includes("/c/"))
    return [
      {
        title: "Enviar relato nesta comunidade",
        href: `/comun/relatar?comunidade=${path.split("/")[3] ?? ""}`,
        time: "5–10 min",
        account: "Conta não obrigatória",
      },
      {
        title: "Acompanhar uma pauta",
        href: "/comun/pautas",
        time: "2 min",
        account: "Conta necessária",
      },
      ...generic.slice(2),
    ];
  if (path.includes("/pautas/"))
    return [
      {
        title: "Participar da próxima etapa",
        href: `${path}#construction_circle`,
        time: "10–20 min",
        account: "Conforme a etapa",
      },
      {
        title: "Acompanhar esta pauta",
        href: `/comun/entrar?returnTo=${encodeURIComponent(path)}`,
        time: "2 min",
        account: "Conta necessária",
        note: "O login devolve você a esta pauta.",
      },
      ...generic.slice(2),
    ];
  if (path.includes("/radio"))
    return [
      {
        title: "Colaborar com a Rádio",
        href: "/comun/radio/contribuir",
        time: "10–20 min",
        account: "Conta opcional",
      },
      ...generic.slice(0, 3),
    ];
  return generic;
}

function Sheet({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) =>
      event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-comun-black/70 p-0 sm:items-center sm:justify-center sm:p-6"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        aria-modal="true"
        aria-labelledby={titleId}
        role="dialog"
        className="comun-sheet max-h-[82vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border-2 border-comun-black bg-comun-paper p-5 text-comun-black shadow-mural sm:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b-2 border-comun-black pb-4">
          <div>
            <p className="text-xs font-black uppercase text-comun-concrete">
              COMUN
            </p>
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-black leading-none"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            title="Fechar"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-lg border-2 border-comun-black"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function ParticipateSheet({
  variant = "header",
  experienceV2 = false,
}: {
  variant?: "header" | "mobile-nav";
  experienceV2?: boolean;
}) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    setShowAll(false);
    setTimeout(() => trigger.current?.focus(), 0);
  };
  const mobile = variant === "mobile-nav";
  const ways = experienceV2
    ? mobileWays
    : mobile
      ? legacyMobileWays
      : contextualWays(path);
  const visibleWays = experienceV2 && !showAll ? ways.slice(0, 4) : ways;
  const sourceRoute = `${path}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const participating =
    mobile && experienceV2 && (open || path === "/comun/participar");
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={mobile ? "Abrir formas de participar" : undefined}
        aria-current={participating ? "page" : undefined}
        className={
          mobile
            ? `flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-black leading-tight ${experienceV2 ? (participating ? "text-comun-yellow" : "text-comun-paper/80") : "text-comun-asphalt"}`
            : "hidden min-h-10 border-2 border-comun-yellow px-3 text-xs font-black uppercase text-comun-yellow hover:bg-comun-yellow hover:text-comun-black lg:inline-flex lg:items-center"
        }
      >
        {mobile ? (
          <>
            <span
              aria-hidden="true"
              className={
                participating
                  ? "grid size-8 place-items-center rounded-[var(--comun-radius-control)] bg-comun-yellow text-xl leading-none text-comun-black"
                  : "grid size-8 place-items-center text-xl leading-none"
              }
            >
              ＋
            </span>
            <span>Participar</span>
          </>
        ) : (
          "Participar agora"
        )}
      </button>
      <Sheet
        title="Escolha uma forma de participar"
        open={open}
        onClose={close}
      >
        <p className="mt-4 text-sm">
          Opções relacionadas ao contexto atual. Cada caminho informa tempo e
          necessidade de conta.
        </p>
        <ul className="mt-5">
          {visibleWays.map((way, index) => {
            const showGroup =
              way.group && way.group !== visibleWays[index - 1]?.group;
            const journeyHref =
              experienceV2 && way.intent
                ? withComunJourneyContext(way.href, {
                    intent: way.intent,
                    sourceRoute,
                    returnTo: sourceRoute,
                    currentStage: "participate",
                    pautaSlug:
                      searchParams.get("pauta") ??
                      (/\/pautas\/([^/?#]+)/.exec(path)?.[1] || undefined),
                    communitySlug:
                      searchParams.get("comunidade") ??
                      (/\/c\/([^/?#]+)/.exec(path)?.[1] || undefined),
                  })
                : way.href;
            return (
              <li
                key={`${way.title}-${way.href}`}
                className="border-b border-comun-black/25"
              >
                {showGroup ? (
                  <h3 className="comun-v2-eyebrow pb-1 pt-5 text-comun-rust">
                    {way.group}
                  </h3>
                ) : null}
                <Link
                  href={withComunAppV2(journeyHref, experienceV2)}
                  onClick={close}
                  className="block py-4 hover:text-comun-rust"
                >
                  <span className="flex items-center justify-between gap-4 font-black">
                    <span>{way.title}</span>
                    <small className="text-right text-xs normal-case font-bold">
                      {way.time}
                    </small>
                  </span>
                  <span className="mt-1 block text-xs font-bold text-comun-concrete">
                    {way.account}
                    {way.note ? ` · ${way.note}` : ""}
                  </span>
                  {way.purpose ? (
                    <span className="mt-2 block text-sm">{way.purpose}</span>
                  ) : null}
                  {way.after ? (
                    <span className="mt-1 block text-xs text-comun-concrete">
                      Depois: {way.after}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
        {experienceV2 && !showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-4 min-h-11 w-full rounded-[var(--comun-radius-control)] border-2 border-comun-black px-4 font-black"
          >
            Ver cultura, memória e direitos
          </button>
        ) : null}
        <Link
          href={withComunAppV2("/comun/participar", experienceV2)}
          onClick={close}
          className="mt-5 inline-flex min-h-11 items-center border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase"
        >
          Ver todas as formas
        </Link>
      </Sheet>
    </>
  );
}

export function SearchSheet({
  experienceV2 = false,
}: {
  experienceV2?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    setTimeout(() => trigger.current?.focus(), 0);
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-12 place-items-center text-comun-yellow hover:bg-comun-paper hover:text-comun-black"
        aria-label="Abrir busca"
      >
        <Search aria-hidden="true" size={19} />
      </button>
      <Sheet title="Buscar no COMUN" open={open} onClose={close}>
        <form
          action="/comun/buscar"
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
        >
          <label className="sr-only" htmlFor="comun-search">
            Termo de busca
          </label>
          <input
            id="comun-search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pauta, território, memória…"
            className="min-h-12 border-2 border-comun-black bg-white px-3"
          />
          {!experienceV2 ? (
            <input type="hidden" name="experiencia" value="legacy" />
          ) : null}
          <button className="min-h-12 border-2 border-comun-black bg-comun-yellow px-4 font-black uppercase">
            Buscar
          </button>
        </form>
        <p className="mt-4 text-sm">
          A busca agrupa resultados públicos por processo, território e memória;
          não há ranking de popularidade.
        </p>
      </Sheet>
    </>
  );
}
