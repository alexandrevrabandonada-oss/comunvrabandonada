"use client";

import { useEffect, useState } from "react";
import { buildComunDenunciasSafeShareData } from "@/lib/comun-denuncias-public-opt-in";

type ConsentState = {
  active: boolean;
  available: boolean;
  collectiveConnection: "waiting" | "matched" | null;
};

export function PublicProjectionConsentPanel({
  walletItemId,
}: {
  walletItemId: string;
}) {
  const [state, setState] = useState<ConsentState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  async function readCollectiveConnection() {
    const response = await fetch(
      `/api/comun/relata/evidence/grouping?walletItemId=${encodeURIComponent(walletItemId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const value = (await response.json()) as {
      collectiveConnection?: "waiting" | "matched";
    };
    return value.collectiveConnection ?? null;
  }

  async function refresh() {
    const response = await fetch(
      `/api/comun/denuncias/public-projection-consent?walletItemId=${encodeURIComponent(walletItemId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      setState(null);
      return;
    }
    const value = (await response.json()) as {
      consent?: { active?: boolean; available?: boolean };
    };
    if (!value.consent?.available) {
      setState(null);
      return;
    }
    const active = Boolean(value.consent.active);
    setState({
      active,
      available: true,
      collectiveConnection: active ? await readCollectiveConnection() : null,
    });
  }

  useEffect(() => {
    // The request synchronizes this panel with the server-owned wallet item.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletItemId]);

  async function update(active: boolean) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/comun/denuncias/public-projection-consent?walletItemId=${encodeURIComponent(walletItemId)}`,
        { method: active ? "POST" : "DELETE" },
      );
      if (!response.ok) throw new Error("consent_unavailable");
      const value = (await response.json()) as {
        consent?: { active?: boolean; available?: boolean };
      };
      if (!value.consent?.available) throw new Error("consent_unavailable");
      const consentActive = Boolean(value.consent.active);
      let collectiveConnection: "waiting" | "matched" | null = null;
      if (consentActive) {
        const groupingResponse = await fetch(
          `/api/comun/relata/evidence/grouping?walletItemId=${encodeURIComponent(walletItemId)}`,
          { method: "POST", cache: "no-store" },
        );
        if (groupingResponse.ok) {
          const grouping = (await groupingResponse.json()) as {
            collectiveConnection?: "waiting" | "matched";
          };
          collectiveConnection = grouping.collectiveConnection ?? null;
        }
      }
      setState({
        active: consentActive,
        available: true,
        collectiveConnection,
      });
      setNotice(
        active
          ? "Permissão registrada. O COMUN pode comparar este relato com outros compatíveis; ele só poderá ter uso territorial público se todas as regras de segurança forem cumpridas."
          : "Permissão retirada. O relato e os encaminhamentos continuam intactos.",
      );
    } catch {
      setNotice("Não foi possível atualizar essa permissão agora.");
    } finally {
      setBusy(false);
    }
  }

  if (!state?.available) return null;

  async function shareComun() {
    setShareNotice(null);
    const shareData = buildComunDenunciasSafeShareData();
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareNotice(
          "Link público do COMUN compartilhado. Seu relato não vai junto.",
        );
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        setShareNotice("Link público copiado. Seu relato não vai junto.");
        return;
      }
      setShareNotice(
        "Copie este link público para compartilhar: " + shareData.url,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareNotice(
        "Não foi possível compartilhar agora. Seu relato não foi enviado.",
      );
    }
  }

  return (
    <section
      className="grid gap-2 border-t-2 border-comun-black/20 pt-3"
      aria-label="Encontrar relatos parecidos na região"
    >
      {state.active ? (
        <>
          <p className="font-black">
            Vamos verificar se isso também está acontecendo por perto
          </p>
          <p className="text-sm">
            Seu relato continua privado. Se aparecer outro relato compatível, o
            COMUN poderá reconhecer que o problema não é isolado. Hoje seu
            relato não entra em mapa público.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void update(false)}
            className="min-h-11 w-fit font-black underline"
          >
            Não usar mais este relato no uso territorial
          </button>
          <div className="grid gap-1" aria-live="polite" role="status">
            <p className="font-black">
              {state.collectiveConnection === "matched"
                ? "Isso não parece ser um caso isolado."
                : "Seu relato está pronto para encontrar outros relatos parecidos."}
            </p>
            {state.collectiveConnection === "matched" ? (
              <p className="text-sm">
                Encontramos outro relato compatível sobre esse tipo de problema
                na região. Os relatos continuam privados.
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="font-black">Isso também está acontecendo por perto?</p>
          <p className="text-sm">
            Se você permitir, o COMUN pode comparar este relato com outros
            relatos compatíveis da região. Usamos uma área aproximada: não
            mostramos seu nome, endereço exato, texto original, fotos nem
            protocolo.
          </p>
          <p className="text-sm font-bold">
            Este consentimento também poderá permitir uso territorial anônimo se
            uma visualização pública segura for aberta no futuro. Hoje não há
            mapa público deste relato.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void update(true)}
              className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black"
            >
              Permitir uso territorial anônimo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setState(null)}
              className="min-h-11 px-3 font-black underline"
            >
              Agora não
            </button>
          </div>
        </>
      )}
      <section className="grid gap-2 border-2 border-comun-black bg-comun-paper p-3">
        <p className="font-black">
          Conhece alguém passando pelo mesmo problema?
        </p>
        <p className="text-sm">
          Compartilhe só a porta pública do COMUN. Seu relato não vai junto.
        </p>
        <button
          type="button"
          onClick={() => void shareComun()}
          className="min-h-11 w-fit border-2 border-comun-black bg-white px-3 font-black"
        >
          Compartilhar o COMUN
        </button>
        {shareNotice ? (
          <p className="text-sm font-bold" role="status">
            {shareNotice}
          </p>
        ) : null}
      </section>
      {notice ? (
        <p role="status" className="text-sm font-bold">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
