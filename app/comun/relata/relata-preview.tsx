"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ComunShell } from "@/components/comun-shell";
import { routeRelata, DARK_STREET_QUESTION } from "@/lib/comun-relata-routing";
import type { RoutingDecision } from "@/lib/comun-relata-contract";
import type { ComunRelataReceipt } from "@/lib/comun-relata-persistence";

const RelataEvidencePanel = dynamic(
  () =>
    import("./relata-evidence-panel").then(
      (module) => module.RelataEvidencePanel,
    ),
  { ssr: false },
);

const RECEIPT_ENDPOINT = "/api/comun/relata/receipt";

function randomProof() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function stateLabel(state: string) {
  return (
    {
      captured_private: "Guardado",
      draft: "Relato recebido",
      triage: "Triagem registrada",
      routed: "Contexto classificado",
      stored_private: "Guardado privadamente",
      withdrawn: "Relato retirado",
    }[state] ?? state
  );
}

export function RelataPreview({ evidenceEnabled }: { evidenceEnabled: boolean }) {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<string | undefined>();
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [receipt, setReceipt] = useState<ComunRelataReceipt | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const proofRef = useRef<{
    idempotencyKey: string;
    receiptSecret: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(RECEIPT_ENDPOINT, { cache: "no-store" })
      .then(async (response) => {
        if (!active || response.status === 404) return;
        if (!response.ok) throw new Error("receipt_unavailable");
        const value = (await response.json()) as {
          receipt: ComunRelataReceipt;
        };
        setReceipt(value.receipt);
      })
      .catch(() => {
        if (active)
          setNotice(
            "Não foi possível recuperar o recibo local agora. Tente atualizar.",
          );
      })
      .finally(() => {
        if (active) setLoadingReceipt(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const runTriage = () => {
    const trimmed = text.trim();
    if (trimmed.length < 8) {
      setNotice("Descreva em poucas palavras o que está acontecendo.");
      return;
    }
    setDecision(
      routeRelata({
        text: trimmed,
        answers: answer ? { homes_power: answer } : undefined,
      }),
    );
    proofRef.current = null;
    setNotice(null);
  };

  const answerHomesPower = (value: "sim" | "nao") => {
    setAnswer(value);
    setDecision(routeRelata({ text, answers: { homes_power: value } }));
    proofRef.current = null;
    setNotice(null);
  };

  const saveReport = async () => {
    if (!decision || decision.missingInformation.length > 0 || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      proofRef.current ??= {
        idempotencyKey: randomProof(),
        receiptSecret: randomProof(),
      };
      const response = await fetch("/api/comun/relata", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          text: text.trim(),
          answers: answer ? { homes_power: answer } : {},
          ...proofRef.current,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      const value = (await response.json()) as { receipt: ComunRelataReceipt };
      setReceipt(value.receipt);
    } catch {
      setNotice(
        "Não foi possível guardar agora. Nenhum órgão recebeu o relato; tente novamente com este formulário aberto.",
      );
    } finally {
      setSaving(false);
    }
  };

  const withdrawReport = async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    setNotice(null);
    try {
      const response = await fetch(RECEIPT_ENDPOINT, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("withdraw_failed");
      const value = (await response.json()) as { receipt: ComunRelataReceipt };
      setReceipt(value.receipt);
      setConfirmWithdrawal(false);
    } catch {
      setNotice(
        "Não foi possível confirmar a retirada agora. Tente novamente.",
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const needsHomeAnswer =
    decision?.missingInformation.includes(DARK_STREET_QUESTION);
  const isEmergency = decision?.urgency === "emergency";

  return (
    <ComunShell
      showSyntheticNotice={false}
      appBar={{ title: "Relata", contextLabel: "Laboratório local" }}
    >
      <div className="min-h-[calc(100dvh-4rem)] bg-comun-paper px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 text-comun-black sm:px-6">
        <main
          className="mx-auto grid w-full max-w-2xl gap-6"
          data-comun-relata-local-only="true"
        >
          <header className="grid gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-comun-muted">
              {evidenceEnabled
                ? "Laboratório local · evidências privadas 48.0C"
                : "Laboratório local · fundação 48.0B"}
            </p>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl">
              O que está acontecendo?
            </h1>
            <p className="max-w-xl text-base leading-7">
              O COMUN organiza e guarda o relato privadamente. Nenhum envio
              externo acontece neste laboratório.
            </p>
          </header>

          {loadingReceipt ? (
            <section
              aria-live="polite"
              className="border-2 border-comun-black bg-white p-4 text-sm font-bold"
            >
              Verificando se há um recibo local neste navegador…
            </section>
          ) : null}

          {!loadingReceipt && !receipt ? (
            <>
              <section
                className="grid gap-3 border-2 border-comun-black bg-[#f8f2e6] p-4 shadow-[5px_5px_0_#0b0b0a]"
                aria-labelledby="relata-input-title"
              >
                <h2 id="relata-input-title" className="text-lg font-black">
                  Relato curto
                </h2>
                <label htmlFor="relata-text" className="text-sm font-bold">
                  Conte o fato sem incluir nome, telefone ou endereço exato.
                </label>
                <textarea
                  id="relata-text"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setDecision(null);
                    proofRef.current = null;
                  }}
                  rows={5}
                  maxLength={600}
                  className="min-h-32 w-full resize-y border-2 border-comun-black bg-white p-3 text-base text-comun-black outline-offset-2"
                  placeholder="Ex.: a rua toda escura desde ontem à noite"
                />
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-comun-muted">
                  <span>{text.length}/600</span>
                  <span>Triagem determinística</span>
                </div>
                <button
                  type="button"
                  onClick={runTriage}
                  className="min-h-12 w-full border-2 border-comun-black bg-comun-yellow px-4 py-3 text-sm font-black uppercase text-comun-black shadow-[4px_4px_0_#0b0b0a]"
                >
                  Organizar situação
                </button>
              </section>

              {needsHomeAnswer ? (
                <section
                  className="grid gap-3 border-2 border-comun-black bg-white p-4"
                  aria-labelledby="relata-question-title"
                >
                  <h2 id="relata-question-title" className="text-lg font-black">
                    Uma pergunta antes de indicar o caminho
                  </h2>
                  <p className="text-base leading-7">{DARK_STREET_QUESTION}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => answerHomesPower("sim")}
                      className="min-h-12 border-2 border-comun-black bg-comun-paper px-4 py-3 text-left text-sm font-black"
                    >
                      As casas também estão sem energia
                    </button>
                    <button
                      type="button"
                      onClick={() => answerHomesPower("nao")}
                      className="min-h-12 border-2 border-comun-black bg-comun-paper px-4 py-3 text-left text-sm font-black"
                    >
                      Apenas as luminárias da rua
                    </button>
                  </div>
                </section>
              ) : null}

              {decision && !needsHomeAnswer ? (
                <section
                  className="grid gap-4 border-2 border-comun-black bg-comun-asphalt p-4 text-comun-paper shadow-[5px_5px_0_#f4c400]"
                  aria-live="polite"
                  data-comun-relata-decision="local-only"
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-comun-yellow">
                      Resultado da triagem
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      {decision.explanation}
                    </h2>
                  </div>
                  {isEmergency ? (
                    <div className="border-2 border-comun-yellow bg-comun-black p-4 text-base leading-7">
                      <p className="font-black text-comun-yellow">
                        Risco imediato
                      </p>
                      <p>
                        Afaste-se do perigo e procure imediatamente o Corpo de
                        Bombeiros pelo 193. O COMUN não faz essa chamada e não
                        deve atrasar a ação de emergência.
                      </p>
                    </div>
                  ) : null}
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-black text-comun-yellow">Urgência</dt>
                      <dd>{decision.urgency}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-comun-yellow">Contexto</dt>
                      <dd>{decision.agencyKind}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-comun-yellow">
                        Privacidade
                      </dt>
                      <dd>{decision.privacyClass}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-comun-yellow">
                        Próximo passo
                      </dt>
                      <dd>{decision.nextStep}</dd>
                    </div>
                  </dl>
                  <div className="grid gap-2 border-2 border-comun-paper/50 p-4 text-sm leading-6">
                    <h3 className="text-base font-black">
                      Guardar privadamente no COMUN
                    </h3>
                    <p>
                      O relato ficará somente no laboratório local. O código
                      será um protocolo COMUN, não oficial. Publicação pública
                      continuará bloqueada. Contato e endereço exato não são
                      solicitados. Após o recibo, localização e fotos serão
                      opcionais, privadas e acompanhadas de explicação
                      contextual.
                    </p>
                    <p className="font-black">
                      Nenhum órgão público recebeu esta manifestação.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={saveReport}
                    disabled={saving}
                    className="min-h-12 w-full border-2 border-comun-paper bg-comun-yellow px-4 py-3 text-sm font-black text-comun-black disabled:cursor-wait disabled:opacity-70"
                  >
                    {saving
                      ? "Guardando privadamente…"
                      : "Guardar este relato no COMUN"}
                  </button>
                </section>
              ) : null}
            </>
          ) : null}

          {receipt ? (
            <section
              className="grid gap-4 border-2 border-comun-black bg-white p-4 shadow-[5px_5px_0_#0b0b0a]"
              aria-labelledby="relata-receipt-title"
              data-comun-relata-receipt={receipt.state}
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-comun-muted">
                  Recibo privado local
                </p>
                <h2 id="relata-receipt-title" className="text-2xl font-black">
                  {stateLabel(receipt.state)}
                </h2>
              </div>
              <div className="border-2 border-comun-black bg-comun-asphalt p-4 text-comun-paper">
                <p className="text-sm font-black text-comun-yellow">
                  Protocolo COMUN
                </p>
                <p className="mt-1 break-all font-mono text-lg font-black">
                  {receipt.protocol}
                </p>
                <p className="mt-2 text-sm">
                  Não é protocolo de Prefeitura, Light ou qualquer órgão
                  público.
                </p>
              </div>
              <p className="border-l-4 border-comun-yellow bg-comun-paper p-3 font-black">
                Nenhum órgão público recebeu esta manifestação.
              </p>
              <div>
                <h3 className="text-lg font-black">Histórico</h3>
                <ol className="mt-3 grid gap-3">
                  {receipt.timeline.map((event, index) => (
                    <li
                      key={`${event.resultCode}-${event.occurredAt}`}
                      className="grid grid-cols-[2rem_1fr] gap-2 text-sm"
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-7 place-items-center rounded-full bg-comun-black font-black text-comun-yellow"
                      >
                        {index + 1}
                      </span>
                      <span>
                        <strong className="block">
                          {stateLabel(event.state)}
                        </strong>
                        <span className="text-comun-muted">
                          {new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(event.occurredAt))}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              {evidenceEnabled ? <RelataEvidencePanel withdrawn={receipt.state === "withdrawn"} /> : null}
              {receipt.state !== "withdrawn" && !confirmWithdrawal ? (
                <button
                  type="button"
                  onClick={() => setConfirmWithdrawal(true)}
                  className="min-h-11 justify-self-start border-2 border-comun-black px-4 py-2 text-sm font-black"
                >
                  Quero retirar este relato
                </button>
              ) : null}
              {receipt.state !== "withdrawn" && confirmWithdrawal ? (
                <div
                  role="group"
                  aria-labelledby="relata-withdraw-title"
                  className="grid gap-3 border-2 border-comun-black bg-comun-paper p-4"
                >
                  <h3 id="relata-withdraw-title" className="font-black">
                    Confirmar retirada
                  </h3>
                  <p className="text-sm leading-6">
                    O relato ficará marcado como retirado e não voltará ao fluxo
                    ativo neste tijolo. O evento de retirada permanece no
                    histórico privado.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={withdrawReport}
                      disabled={withdrawing}
                      className="min-h-11 border-2 border-comun-black bg-comun-black px-4 py-2 text-sm font-black text-white disabled:opacity-70"
                    >
                      {withdrawing ? "Retirando…" : "Confirmar retirada"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmWithdrawal(false)}
                      className="min-h-11 border-2 border-comun-black px-4 py-2 text-sm font-black"
                    >
                      Manter relato
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {notice ? (
            <p
              role="alert"
              className="border-l-4 border-comun-danger bg-white p-3 text-sm font-bold"
            >
              {notice}
            </p>
          ) : null}

          <aside className="border-l-4 border-comun-yellow bg-white p-4 text-sm leading-6">
            <p className="font-black">Privacidade e limites</p>
            <p>
              {evidenceEnabled
                ? "Localização e fotografias permanecem privadas; não há contato, mapa público ou canal automático. O recibo de acesso fica em cookie HttpOnly deste navegador."
                : "Não há localização, anexo, contato, mapa público ou canal automático. O recibo de acesso fica em cookie HttpOnly deste navegador."}
            </p>
          </aside>
        </main>
      </div>
    </ComunShell>
  );
}
