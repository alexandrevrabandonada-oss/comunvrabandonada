"use client";

import { useEffect, useState } from "react";

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
  if (item.action_required) return "Precisa de você";
  if (item.presentation_state === "withdrawn") return "Retirado";
  if (item.presentation_state === "Acompanhando") return "Acompanhando";
  return item.presentation_state || "Guardado";
}

export function ParticipationWalletPanel({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [present, setPresent] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [legacyProtocol, setLegacyProtocol] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
      setNotice("Carteira criada localmente. Salve o código antes de fechar.");
    } catch {
      setNotice("A carteira local não está disponível neste laboratório.");
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

  const attention = items.filter((item) => item.action_required);
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
        <p className="comun-v2-eyebrow">Minha Participação</p>
        <h2 id="wallet-title" className="text-2xl font-black normal-case">
          Carteira de participação
        </h2>
        <p className="text-sm leading-6">
          Reúne relatos, observações e acompanhamentos sem exigir conta. O
          servidor guarda somente hashes e referências protegidas.
        </p>
      </header>
      {!present ? (
        <div className="grid gap-3 border-2 border-comun-black bg-comun-yellow p-4 text-comun-black">
          <p className="font-black">
            Ainda não há uma carteira neste navegador.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={createWallet}
            className="min-h-11 border-2 border-comun-black bg-white px-4 py-2 text-left font-black"
          >
            Criar carteira local
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
            Recuperar carteira
          </button>
        </div>
      ) : null}
      {recoveryCode ? (
        <div className="grid gap-2 border-2 border-comun-black bg-[#f8f2e6] p-4">
          <p className="text-xs font-black uppercase">Código exibido uma vez</p>
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
          <p className="text-xs">
            Não há URL, QR ou segredo na lista de itens.
          </p>
        </div>
      ) : null}
      {present && attention.length ? (
        <div className="grid gap-2 border-2 border-comun-black bg-comun-yellow p-4 text-comun-black">
          <p className="text-xs font-black uppercase">Precisa de você</p>
          {attention.map((item) => (
            <div
              key={item.item_id}
              className="flex items-center justify-between gap-3"
            >
              <span>
                <strong className="block">{item.title_template}</strong>
                <small>{item.action_required}</small>
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.item_id)}
                className="min-h-11 border-2 border-comun-black bg-white px-3 text-sm font-black"
              >
                Arquivar
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {present
        ? grouped.map(([title, group]) =>
            group.length ? (
              <div key={title} className="grid gap-2">
                <h3 className="font-black normal-case">{title}</h3>
                {group.map((item) => (
                  <article
                    key={item.item_id}
                    className="grid gap-2 border-2 border-comun-black/30 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase">
                        {statusLabel(item)}
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
                      {item.category ?? item.source_domain} · atualizado em{" "}
                      {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => removeItem(item.item_id)}
                        className="min-h-11 font-black underline"
                      >
                        Arquivar ou retirar
                      </button>
                      {item.action_required ? (
                        <span className="min-h-11 border-2 border-comun-black px-3 py-2 text-sm font-black">
                          {item.action_required}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null,
          )
        : null}
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
          Sua carteira está vazia. Relatos novos, observações e casos
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
        Nenhum relato é encaminhado por esta tela. A carteira não substitui o
        protocolo COMUN.
      </p>
    </section>
  );
}
