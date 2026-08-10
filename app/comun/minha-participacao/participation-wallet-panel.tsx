"use client";

import { useEffect, useState } from "react";
import { ComunStmuMultichannelPanel } from "./comun-stmu-multichannel-panel";
import { ComunStmuAssistedPanel } from "./comun-stmu-assisted-panel";
import { ComunEssentialServicesPanel } from "./comun-essential-services-panel";
import { resolveWalletRelataAction } from "@/lib/comun-wallet-relata-action";

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

export function ParticipationWalletPanel({
  standalone = false,
  accountAvailable = false,
  stmuAssistedEnabled = false,
  stmuMultichannelEnabled = false,
  essentialServicesEnabled = false,
  essentialForwardingEnabled = false,
}: {
  standalone?: boolean;
  accountAvailable?: boolean;
  stmuAssistedEnabled?: boolean;
  stmuMultichannelEnabled?: boolean;
  essentialServicesEnabled?: boolean;
  essentialForwardingEnabled?: boolean;
}) {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [present, setPresent] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [legacyProtocol, setLegacyProtocol] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [accountLinked, setAccountLinked] = useState(false);

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

  const grouped = [
    [
      "Meus relatos",
      items.filter((item) => item.item_type === "relata_report"),
    ],
    [
      "Observações",
      items.filter((item) => item.item_type === "bus_observation"),
    ],
    [
      "Casos acompanhados",
      items.filter((item) =>
        ["collective_case_follow", "community_confirmation"].includes(
          item.item_type,
        ),
      ),
    ],
    [
      "Protocolos acompanhados",
      items.filter((item) => item.item_type === "legacy_report_follow"),
    ],
  ] as const;

  return (
    <section
      className={`grid gap-4 ${standalone ? "mx-auto w-full max-w-2xl" : "mt-6"}`}
      data-comun-participation-wallet="true"
      aria-labelledby="wallet-title"
    >
      <header className="grid gap-2">
        <p className="comun-v2-eyebrow">Minha área</p>
        <h2 id="wallet-title" className="text-2xl font-black normal-case">
          Meus registros
        </h2>
        <p className="text-sm leading-6">
          Relatos e acompanhamentos guardados neste aparelho.
        </p>
      </header>
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
      {accountAvailable && present ? (
        <div className="grid gap-2 border-2 border-comun-black/20 bg-white p-4 text-sm">
          <p className="font-black">Conta e Carteira</p>
          <p>
            O vínculo é opcional e só acontece quando você pedir. A Carteira
            continua recuperável pelo código se o vínculo for removido.
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
              : "Vincular esta carteira à minha conta"}
          </button>
        </div>
      ) : null}
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
      {present
        ? grouped.map(([title, group]) =>
            group.length ? (
              <div key={title} className="grid gap-2">
                <h3 className="font-black normal-case">{title}</h3>
                {group.map((item) => {
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
                          },
                        })
                      : null;
                  return (
                    <article
                      key={item.item_id}
                      data-wallet-item-id={item.item_id}
                      className={`grid gap-2 border-2 bg-white p-4 ${
                        relataAction?.nextStep
                          ? "border-comun-black"
                          : "border-comun-black/30"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase">
                          {relataAction?.statusOverride ?? statusLabel(item)}
                        </span>
                        {item.protocol_masked ? (
                          <span className="font-mono text-xs">
                            {item.protocol_masked}
                          </span>
                        ) : null}
                      </div>
                      <h4 className="font-black normal-case">
                        {item.title_template}
                      </h4>
                      <p className="text-sm text-comun-black/70">
                        {relataAction?.categoryLabel ?? item.title_template} ·
                        atualizado em{" "}
                        {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                      </p>
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
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => removeItem(item.item_id)}
                          className="min-h-11 font-black underline"
                        >
                          Arquivar ou retirar
                        </button>
                      </div>
                      {relataAction?.nextStep ? (
                        <div className="border-l-4 border-comun-yellow bg-[#f8f2e6] p-3 text-sm">
                          <p className="font-black">Próximo passo</p>
                          <p>{relataAction.nextStep}</p>
                        </div>
                      ) : null}
                      {relataAction?.availabilityMessage ? (
                        <p className="border-t-2 pt-3 text-sm font-bold">
                          {relataAction.availabilityMessage}
                        </p>
                      ) : null}
                      {relataAction?.route === "bus" ? (
                        relataAction.showStmuAssisted ? (
                          <ComunStmuAssistedPanel walletItemId={item.item_id} />
                        ) : relataAction.showStmuMultichannel ? (
                          <ComunStmuMultichannelPanel
                            relataCaseId={item.item_id}
                          />
                        ) : null
                      ) : relataAction?.route === "essential_service" ? (
                        relataAction.showEssentialServices ? (
                          <ComunEssentialServicesPanel
                            walletItemId={item.item_id}
                          />
                        ) : null
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null,
          )
        : null}
      {notice ? (
        <p
          role="status"
          className="border-l-4 border-comun-yellow bg-white p-3 text-sm"
        >
          {notice}
        </p>
      ) : null}
      {present ? (
        <div className="grid gap-2 border-t-2 border-comun-black/20 pt-4">
          <h3 className="font-black normal-case">Protocolos oficiais</h3>
          <p className="text-sm">
            Quando um relato for encaminhado, o protocolo do órgão aparecerá
            aqui. Nada é enviado por esta carteira.
          </p>
        </div>
      ) : null}
      {present ? (
        <div className="grid gap-2 border-t-2 border-comun-black/20 pt-4">
          <h3 className="font-black normal-case">
            Acompanhar protocolo legado
          </h3>
          <p className="text-sm">
            Ele aparecerá como “Protocolo acompanhado”, sem afirmar posse
            privada.
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
      ) : null}
      {present && !items.length ? (
        <p className="border-2 border-comun-black/20 bg-white p-4 text-sm">
          Você ainda não tem registros. Relatos novos, observações e casos
          acompanhados aparecerão aqui.
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="border-l-4 border-comun-yellow bg-white p-3 text-sm font-bold"
        >
          {notice}
        </p>
      ) : null}
      <p className="text-xs text-comun-black/60">
        Nenhum relato é encaminhado por esta tela. A Carteira é a proteção de
        recuperação dos seus registros e não substitui o protocolo COMUN.
      </p>
    </section>
  );
}
