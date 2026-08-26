"use client";

import { useEffect, useState } from "react";

type ConsentState = {
  active: boolean;
  available: boolean;
};

export function PublicProjectionConsentPanel({
  walletItemId,
}: {
  walletItemId: string;
}) {
  const [state, setState] = useState<ConsentState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
    setState({
      active: Boolean(value.consent.active),
      available: true,
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
      setState({ active: Boolean(value.consent.active), available: true });
      setNotice(
        active
          ? "Permissão registrada. O relato só poderá aparecer se todas as regras de segurança forem cumpridas."
          : "Este relato não será usado no mapa. O relato e os encaminhamentos continuam intactos.",
      );
    } catch {
      setNotice("Não foi possível atualizar essa permissão agora.");
    } finally {
      setBusy(false);
    }
  }

  if (!state?.available) return null;

  return (
    <section
      className="grid gap-2 border-t-2 border-comun-black/20 pt-3"
      aria-label="Uso anônimo no mapa"
    >
      {state.active ? (
        <>
          <p className="font-black">Permissão registrada</p>
          <p className="text-sm">
            Seu relato pode ajudar o COMUN a mostrar uma área aproximada onde
            esse problema acontece. Isso não significa que ele já esteja no
            mapa.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void update(false)}
            className="min-h-11 w-fit font-black underline"
          >
            Não usar mais este relato no mapa
          </button>
        </>
      ) : (
        <>
          <p className="font-black">
            Ajude a mostrar este problema no território
          </p>
          <p className="text-sm">
            Se você quiser, seu relato pode ajudar o COMUN a mostrar que este
            tipo de problema está acontecendo nesta região. O mapa usa uma área
            aproximada. Não mostramos seu nome, endereço, texto original, fotos
            nem protocolo.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void update(true)}
              className="min-h-11 border-2 border-comun-black bg-comun-yellow px-3 font-black"
            >
              Permitir uso anônimo no mapa
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
      {notice ? (
        <p role="status" className="text-sm font-bold">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
