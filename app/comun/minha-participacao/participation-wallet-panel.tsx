"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ComunStmuMultichannelPanel } from "./comun-stmu-multichannel-panel";
import { ComunStmuAssistedPanel } from "./comun-stmu-assisted-panel";
import { ComunEssentialServicesPanel } from "./comun-essential-services-panel";
import { ComunSensitiveForwardingPanel } from "./comun-sensitive-forwarding-panel";
import { isSensitiveForwardingCategory } from "@/lib/comun-sensitive-forwarding-feature";
import { resolveWalletRelataAction } from "@/lib/comun-wallet-relata-action";
import { resolveComunForwardingExperience } from "@/lib/comun-forwarding-experience";
import { isCivicAssistedCategory } from "@/lib/comun-civic-forwarding-feature";
import { ComunCivicForwardingPanel } from "./comun-civic-forwarding-panel";
import { PublicProjectionConsentPanel } from "./public-projection-consent-panel";
import { isComunPublicProjectionOptInCategory } from "@/lib/comun-denuncias-public-opt-in";

type WalletItem = {
  item_id: string;
  item_type: string;
  title_template: string;
  category: string | null;
  presentation_state: string;
  action_required: string | null;
  protocol_masked: string | null;
  source_domain: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function statusLabel(item: WalletItem) {
  const labels: Record<string, string> = {
    Guardado: "Guardado",
    "Pronto para encaminhar": "Pronto para encaminhar",
    "Encaminhamento preparado": "Encaminhamento preparado",
    "Enviado por você": "Enviado por você",
    "Aguardando retorno": "Aguardando retorno",
    "Resposta registrada": "Resposta registrada",
    Retirado: "Retirado",
    captured_private: "Guardado",
    ready_to_forward: "Pronto para encaminhar",
    forwarding_prepared: "Encaminhamento preparado",
    person_declared_sent: "Enviado por você",
    waiting_response: "Aguardando retorno",
    responded: "Resposta registrada",
    published: "Publicado",
    withdrawn: "Retirado",
    Acompanhando: "Acompanhando",
  };
  return (
    labels[item.presentation_state] ??
    (item.action_required ? "Precisa de você" : "Guardado")
  );
}

function isSafetyPriority(item: WalletItem) {
  return (
    item.metadata?.immediateDanger === true ||
    ["urgent", "emergency"].includes(String(item.metadata?.urgency ?? "")) ||
    item.category === "child_protection"
  );
}

function itemDate(item: WalletItem) {
  return new Date(item.updated_at).toLocaleDateString("pt-BR");
}

export function ParticipationWalletPanel({
  standalone = false,
  accountAvailable = false,
  stmuAssistedEnabled = false,
  stmuMultichannelEnabled = false,
  essentialServicesEnabled = false,
  essentialForwardingEnabled = false,
  sensitiveForwardingEnabled = false,
  childProtectionChannelOnlyEnabled = false,
  civicEnvironmentalForwardingEnabled = false,
  civicUrbanForwardingEnabled = false,
  inboxAttention = [],
}: {
  standalone?: boolean;
  accountAvailable?: boolean;
  stmuAssistedEnabled?: boolean;
  stmuMultichannelEnabled?: boolean;
  essentialServicesEnabled?: boolean;
  essentialForwardingEnabled?: boolean;
  sensitiveForwardingEnabled?: boolean;
  childProtectionChannelOnlyEnabled?: boolean;
  civicEnvironmentalForwardingEnabled?: boolean;
  civicUrbanForwardingEnabled?: boolean;
  inboxAttention?: Array<{
    title: string;
    summary: string | null;
    actionUrl: string;
  }>;
}) {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [present, setPresent] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [legacyProtocol, setLegacyProtocol] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [accountLinked, setAccountLinked] = useState(false);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  async function refresh() {
    const response = await fetch("/api/comun/participation-wallet", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const value = (await response.json()) as {
      wallet: { present: boolean } | null;
      items: WalletItem[];
    };
    setPresent(Boolean(value.wallet?.present));
    setItems(Array.isArray(value.items) ? value.items : []);
  }

  // Hydrate from the server-owned wallet cookie once when the panel mounts.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function createWallet() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/comun/participation-wallet", {
        method: "POST",
      });
      const value = (await response.json()) as {
        recoveryCode?: string;
        code?: string;
      };
      if (!response.ok) throw new Error(value.code ?? "wallet_create_failed");
      setPresent(true);
      setRecoveryCode(value.recoveryCode ?? null);
      setNotice(
        "Seus registros estão prontos. Guarde o código antes de fechar.",
      );
    } catch {
      setNotice("A Carteira não está disponível agora.");
    } finally {
      setBusy(false);
    }
  }

  async function recoverWallet() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        "/api/comun/participation-wallet/recovery/redeem",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ recoveryCode: recoveryInput }),
        },
      );
      if (!response.ok) throw new Error("recovery_failed");
      const value = (await response.json()) as { items?: WalletItem[] };
      setItems(value.items ?? []);
      setPresent(true);
      setRecoveryInput("");
      setNotice("Carteira recuperada. O código anterior foi invalidado.");
    } catch {
      setNotice(
        "Código inválido ou indisponível. A mensagem é a mesma para não revelar a existência da carteira.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function followLegacy() {
    if (!legacyProtocol.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        "/api/comun/participation-wallet/items/follow-legacy",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ protocol: legacyProtocol.trim() }),
        },
      );
      if (!response.ok) throw new Error("follow_failed");
      setLegacyProtocol("");
      await refresh();
    } catch {
      setNotice("Não foi possível adicionar esse protocolo acompanhado.");
    } finally {
      setBusy(false);
    }
  }

  async function linkAccount() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        "/api/comun/participation-wallet/account/link",
        { method: "POST" },
      );
      if (!response.ok) throw new Error("link_failed");
      setAccountLinked(true);
      setNotice("Carteira vinculada à sua conta. Nenhum item foi duplicado.");
    } catch {
      setNotice("Não foi possível vincular a Carteira agora.");
    } finally {
      setBusy(false);
    }
  }

  async function unlinkAccount() {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        "/api/comun/participation-wallet/account/unlink",
        { method: "POST" },
      );
      if (!response.ok) throw new Error("unlink_failed");
      setAccountLinked(false);
      setNotice(
        "Vínculo removido. A Carteira e seus itens continuam existindo.",
      );
    } catch {
      setNotice("Não foi possível remover o vínculo agora.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    if (
      !window.confirm(
        "Arquivar este item? Um relato COMUN será retirado e ficará registrado no histórico.",
      )
    )
      return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/comun/participation-wallet/items/${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("remove_failed");
      await refresh();
    } catch {
      setNotice("Não foi possível arquivar este item agora.");
    } finally {
      setBusy(false);
    }
  }

  function saveRecoveryCode() {
    if (!recoveryCode) return;
    const blob = new Blob(
      [`Código de recuperação da Carteira COMUN\n\n${recoveryCode}\n`],
      { type: "text/plain;charset=utf-8" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "comun-carteira-recuperacao.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const resolvedItems = useMemo(
    () =>
      items.map((item) => {
        const relataAction =
          item.item_type === "relata_report"
            ? resolveWalletRelataAction({
                category: item.category,
                presentationState: item.presentation_state,
                actionRequired: item.action_required,
                metadata: item.metadata ?? {},
                featureFlags: {
                  stmuAssistedEnabled,
                  stmuMultichannelEnabled,
                  essentialServicesEnabled,
                  essentialForwardingEnabled,
                  sensitiveForwardingEnabled,
                  childProtectionChannelOnlyEnabled,
                  civicForwardingEnabled:
                    civicEnvironmentalForwardingEnabled ||
                    civicUrbanForwardingEnabled,
                },
              })
            : null;
        return { item, relataAction };
      }),
    [
      items,
      stmuAssistedEnabled,
      stmuMultichannelEnabled,
      essentialServicesEnabled,
      essentialForwardingEnabled,
      sensitiveForwardingEnabled,
      childProtectionChannelOnlyEnabled,
      civicEnvironmentalForwardingEnabled,
      civicUrbanForwardingEnabled,
    ],
  );
  const orderedItems = useMemo(
    () =>
      [...resolvedItems].sort((a, b) => {
        const safetyDelta =
          Number(isSafetyPriority(b.item)) - Number(isSafetyPriority(a.item));
        if (safetyDelta) return safetyDelta;
        const actionDelta =
          Number(Boolean(b.item.action_required || b.relataAction?.nextStep)) -
          Number(Boolean(a.item.action_required || a.relataAction?.nextStep));
        if (actionDelta) return actionDelta;
        return (
          new Date(b.item.updated_at).getTime() -
          new Date(a.item.updated_at).getTime()
        );
      }),
    [resolvedItems],
  );
  const attentionItems = orderedItems.filter(
    ({ item, relataAction }) =>
      isSafetyPriority(item) ||
      Boolean(item.action_required) ||
      Boolean(relataAction?.nextStep),
  );
  const primaryAttention = attentionItems[0] ?? null;
  const remainingAttentionCount =
    attentionItems.length + inboxAttention.length - 1;

  function openItem(itemId: string) {
    setOpenItemId(itemId);
    window.requestAnimationFrame(() => itemRefs.current[itemId]?.focus());
  }

  return (
    <section
      className={`grid gap-4 ${standalone ? "mx-auto w-full max-w-2xl" : "mt-6"}`}
      data-comun-participation-wallet="true"
      aria-label="Meus registros"
    >
      {recoveryCode ? (
        <div className="grid gap-2 border-2 border-comun-black bg-[#f8f2e6] p-4">
          <p className="text-lg font-black">Guardar código de recuperação</p>
          <p className="text-sm">
            Ele permite recuperar seus registros em outro aparelho.
          </p>
          <p className="break-all font-mono text-lg font-black tracking-wider">
            {recoveryCode}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(recoveryCode)}
              className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black"
            >
              Copiar código
            </button>
            <button
              type="button"
              onClick={saveRecoveryCode}
              className="min-h-11 border-2 border-comun-black bg-white px-3 font-black"
            >
              Salvar arquivo
            </button>
          </div>
        </div>
      ) : null}
      <section className="grid gap-3" aria-labelledby="attention-title">
        <h2 id="attention-title" className="text-xl font-black normal-case">
          Precisa de você
        </h2>
        {primaryAttention ? (
          <article className="surface-alert grid gap-3 rounded-[var(--comun-radius-card)] border-2 border-comun-black p-4">
            <p className="text-xs font-black uppercase">
              {primaryAttention.relataAction?.categoryLabel ??
                primaryAttention.item.title_template}
            </p>
            <p className="font-black">
              {isSafetyPriority(primaryAttention.item)
                ? (primaryAttention.relataAction?.nextStep ??
                  "Confira agora a orientação de segurança.")
                : (primaryAttention.relataAction?.nextStep ??
                  primaryAttention.item.action_required)}
            </p>
            <button
              type="button"
              data-primary-action="true"
              onClick={() => openItem(primaryAttention.item.item_id)}
              className="min-h-11 w-fit border-2 border-comun-black bg-comun-yellow px-4 py-2 font-black"
            >
              Continuar
            </button>
            {remainingAttentionCount > 0 ? (
              <Link
                className="text-sm font-black underline"
                href={
                  inboxAttention.length
                    ? "/comun/caixa-de-entrada"
                    : "#meus-registros"
                }
              >
                Mais {remainingAttentionCount}{" "}
                {remainingAttentionCount === 1 ? "item pede" : "itens pedem"}{" "}
                atenção
              </Link>
            ) : null}
          </article>
        ) : inboxAttention[0] ? (
          <article className="surface-alert grid gap-3 rounded-[var(--comun-radius-card)] border-2 border-comun-black p-4">
            <p className="text-xs font-black uppercase">Atualização</p>
            <p className="font-black">{inboxAttention[0].title}</p>
            {inboxAttention[0].summary ? (
              <p className="text-sm">{inboxAttention[0].summary}</p>
            ) : null}
            <Link
              href={inboxAttention[0].actionUrl}
              data-primary-action="true"
              className="inline-flex min-h-11 w-fit items-center border-2 border-comun-black bg-comun-yellow px-4 py-2 font-black"
            >
              Continuar
            </Link>
            {inboxAttention.length > 1 ? (
              <Link
                className="text-sm font-black underline"
                href="/comun/caixa-de-entrada"
              >
                Mais {inboxAttention.length - 1}{" "}
                {inboxAttention.length === 2 ? "item pede" : "itens pedem"}{" "}
                atenção
              </Link>
            ) : null}
          </article>
        ) : (
          <p className="surface-paper rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4 text-sm">
            Nada precisa da sua atenção agora.
          </p>
        )}
      </section>
      {!present ? (
        <div className="grid gap-3 border-2 border-comun-black bg-comun-yellow p-4 text-comun-black">
          <p className="font-black">
            Você ainda não tem registros neste navegador.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={createWallet}
            className="min-h-11 border-2 border-comun-black bg-white px-4 py-2 text-left font-black"
          >
            Começar meus registros
          </button>
          <label
            className="grid gap-1 text-sm font-bold"
            htmlFor="wallet-recovery"
          >
            Já tenho um código de recuperação
            <input
              id="wallet-recovery"
              value={recoveryInput}
              onChange={(event) =>
                setRecoveryInput(event.target.value.toUpperCase())
              }
              className="min-h-11 border-2 border-comun-black bg-white p-3 font-mono"
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            />
          </label>
          <button
            type="button"
            disabled={busy || !recoveryInput}
            onClick={recoverWallet}
            className="min-h-11 border-2 border-comun-black bg-comun-asphalt px-4 py-2 text-left font-black text-comun-paper"
          >
            Recuperar meus registros
          </button>
        </div>
      ) : null}
      {present ? (
        <section
          id="meus-registros"
          className="grid gap-3"
          aria-labelledby="records-title"
        >
          <h2
            id="wallet-records-title"
            className="text-xl font-black normal-case"
          >
            Meus registros
          </h2>
          {orderedItems.map(({ item, relataAction }) => {
            const experience =
              item.item_type === "relata_report"
                ? resolveComunForwardingExperience({
                    category: item.category,
                    urgency:
                      typeof item.metadata?.urgency === "string"
                        ? item.metadata.urgency
                        : null,
                    metadata: item.metadata ?? {},
                    essentialForwardingEnabled:
                      essentialServicesEnabled && essentialForwardingEnabled,
                    sensitiveForwardingEnabled,
                    civicForwardingEnabled:
                      item.category === "waste_or_debris" ||
                      item.category === "smoke_or_environmental_trace" ||
                      item.category === "environmental_pollution"
                        ? civicEnvironmentalForwardingEnabled
                        : civicUrbanForwardingEnabled,
                  })
                : null;
            const open = openItemId === item.item_id;
            return (
              <article
                key={item.item_id}
                data-wallet-item-id={item.item_id}
                ref={(node) => {
                  itemRefs.current[item.item_id] = node;
                }}
                tabIndex={-1}
                className="surface-paper grid gap-2 rounded-[var(--comun-radius-card)] border border-comun-black/25 p-4 focus:outline focus:outline-2 focus:outline-offset-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase">
                    {relataAction?.statusOverride ?? statusLabel(item)}
                  </span>
                  <time className="text-xs" dateTime={item.updated_at}>
                    {itemDate(item)}
                  </time>
                </div>
                <h3 className="font-black normal-case">
                  {relataAction?.categoryLabel ?? item.title_template}
                </h3>
                {relataAction?.detailLabel ? (
                  <p className="text-sm font-bold">
                    {relataAction.detailLabel}
                  </p>
                ) : null}
                {relataAction?.stateMessage ? (
                  <p className="text-sm font-bold text-comun-black/80">
                    {relataAction.stateMessage}
                  </p>
                ) : null}
                {relataAction?.nextStep ? (
                  <div className="border-l-4 border-comun-yellow pl-3 text-sm">
                    <p className="font-black">Próximo passo</p>
                    <p>{relataAction.nextStep}</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`wallet-item-details-${item.item_id}`}
                  onClick={() => setOpenItemId(open ? null : item.item_id)}
                  className="min-h-11 w-fit font-black underline"
                >
                  {open
                    ? "Fechar detalhes"
                    : relataAction?.nextStep
                      ? "Continuar"
                      : "Ver detalhes"}
                </button>
                <div
                  id={`wallet-item-details-${item.item_id}`}
                  className={
                    open
                      ? "grid gap-3 border-t-2 border-comun-black/20 pt-3"
                      : "hidden"
                  }
                >
                  {item.protocol_masked ? (
                    <p className="text-sm">
                      <span className="font-bold">Protocolo:</span>{" "}
                      <span className="font-mono">{item.protocol_masked}</span>
                    </p>
                  ) : null}
                  <details>
                    <summary className="min-h-11 cursor-pointer py-3 font-black underline">
                      Opções do registro
                    </summary>
                    <div className="flex flex-wrap gap-3 pb-2">
                      <button
                        type="button"
                        onClick={() => removeItem(item.item_id)}
                        className="min-h-11 font-black underline"
                      >
                        Arquivar ou retirar
                      </button>
                    </div>
                  </details>
                  {relataAction?.availabilityMessage ? (
                    <p className="border-t-2 pt-3 text-sm font-bold">
                      {relataAction.availabilityMessage}
                    </p>
                  ) : null}
                  {experience ? (
                    <section
                      className="grid gap-1 border-t-2 pt-3"
                      aria-label="Próximo caminho"
                    >
                      <p className="text-xs font-black uppercase">
                        Como resolver isso
                      </p>
                      <p className="font-black">{experience.headline}</p>
                      <p className="text-sm">{experience.explanation}</p>
                      {experience.privacyNote ? (
                        <p className="text-xs font-bold">
                          {experience.privacyNote}
                        </p>
                      ) : null}
                      {experience.escalationNote ? (
                        <p className="text-xs">{experience.escalationNote}</p>
                      ) : null}
                    </section>
                  ) : null}
                  {item.item_type === "relata_report" &&
                  isComunPublicProjectionOptInCategory(item.category) &&
                  !["withdrawn", "Retirado"].includes(
                    item.presentation_state,
                  ) ? (
                    <PublicProjectionConsentPanel walletItemId={item.item_id} />
                  ) : null}
                  {relataAction?.route === "bus" ? (
                    relataAction.showStmuAssisted ? (
                      <ComunStmuAssistedPanel walletItemId={item.item_id} />
                    ) : relataAction.showStmuMultichannel ? (
                      <ComunStmuMultichannelPanel relataCaseId={item.item_id} />
                    ) : null
                  ) : relataAction?.route === "essential_service" ? (
                    relataAction.showEssentialServices ? (
                      <ComunEssentialServicesPanel
                        walletItemId={item.item_id}
                      />
                    ) : null
                  ) : relataAction?.route === "sensitive_service" &&
                    relataAction.showSensitiveForwarding &&
                    isSensitiveForwardingCategory(item.category) ? (
                    <ComunSensitiveForwardingPanel
                      walletItemId={item.item_id}
                      category={item.category}
                    />
                  ) : null}
                  {experience?.mode === "civic_assisted" &&
                  (item.category === "waste_or_debris" ||
                  item.category === "smoke_or_environmental_trace" ||
                  item.category === "environmental_pollution"
                    ? civicEnvironmentalForwardingEnabled
                    : civicUrbanForwardingEnabled) &&
                  isCivicAssistedCategory(item.category) ? (
                    <ComunCivicForwardingPanel walletItemId={item.item_id} />
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="border-l-4 border-comun-yellow bg-white p-3 text-sm"
        >
          {notice}
        </p>
      ) : null}
      {present ? (
        <details className="border-t-2 border-comun-black/20 pt-2">
          <summary className="min-h-11 cursor-pointer py-3 font-black">
            Tenho um protocolo antigo
          </summary>
          <div className="grid gap-2 pb-3">
            <p className="text-sm">
              Adicione um registro antigo para acompanhá-lo aqui.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={legacyProtocol}
                onChange={(event) =>
                  setLegacyProtocol(event.target.value.toUpperCase())
                }
                className="min-h-11 min-w-0 flex-1 border-2 border-comun-black bg-white p-3 font-mono"
                placeholder="COMUN-..."
              />
              <button
                type="button"
                disabled={busy || !legacyProtocol}
                onClick={followLegacy}
                className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black"
              >
                Acompanhar
              </button>
            </div>
          </div>
        </details>
      ) : null}
      {accountAvailable && present ? (
        <details className="border-t-2 border-comun-black/20 pt-2">
          <summary className="min-h-11 cursor-pointer py-3 font-black">
            Conta e recuperação
          </summary>
          <div className="grid gap-2 pb-3 text-sm">
            <p>
              Vincule seus registros à conta ou mantenha a recuperação por
              código.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void (accountLinked ? unlinkAccount() : linkAccount())
              }
              className="min-h-11 w-fit border-2 border-comun-black bg-comun-yellow px-3 font-black"
            >
              {accountLinked
                ? "Remover vínculo com minha conta"
                : "Vincular meus registros à minha conta"}
            </button>
          </div>
        </details>
      ) : null}
      {present && !items.length ? (
        <p className="border-2 border-comun-black/20 bg-white p-4 text-sm">
          Você ainda não tem registros. Relatos novos, observações e casos
          acompanhados aparecerão aqui.
        </p>
      ) : null}
      <p className="text-xs text-comun-black/60">
        Nenhum relato é encaminhado por esta tela.
      </p>
    </section>
  );
}
