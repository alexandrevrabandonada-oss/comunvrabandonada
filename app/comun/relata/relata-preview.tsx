"use client";

import { useState } from "react";
import { ComunShell } from "@/components/comun-shell";
import { createRelataPreview } from "@/lib/comun-relata-preview";
import { routeRelata, DARK_STREET_QUESTION } from "@/lib/comun-relata-routing";
import type { RoutingDecision } from "@/lib/comun-relata-contract";

export function RelataPreview() {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<string | undefined>();
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runTriage = () => {
    const trimmed = text.trim();
    if (trimmed.length < 8) {
      setNotice("Descreva em poucas palavras o que está acontecendo.");
      return;
    }
    const next = routeRelata({ text: trimmed, answers: answer ? { homes_power: answer } : undefined });
    setDecision(next);
    setNotice(null);
  };

  const preview = decision ? createRelataPreview({ text, answers: answer ? { homes_power: answer } : undefined }, decision) : null;
  const needsHomeAnswer = decision?.missingInformation.includes(DARK_STREET_QUESTION);

  return (
    <ComunShell showSyntheticNotice={false} appBar={{ title: "Relata", contextLabel: "Triagem local" }}>
      <div className="min-h-[calc(100dvh-4rem)] bg-comun-paper px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 text-comun-black sm:px-6">
        <main className="mx-auto grid w-full max-w-2xl gap-6" data-comun-relata-local-only="true">
          <header className="grid gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-comun-muted">Preview local · fundação 48.0A</p>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl">O que está acontecendo?</h1>
            <p className="max-w-xl text-base leading-7">Descreva a situação. O COMUN organiza o contexto e indica uma próxima pergunta; não envia nada a órgão público nesta etapa.</p>
          </header>

          <section className="grid gap-3 border-2 border-comun-black bg-[#f8f2e6] p-4 shadow-[5px_5px_0_#0b0b0a]" aria-labelledby="relata-input-title">
            <h2 id="relata-input-title" className="text-lg font-black">Relato curto</h2>
            <label htmlFor="relata-text" className="text-sm font-bold">Conte o fato sem incluir nome, telefone ou endereço exato.</label>
            <textarea id="relata-text" value={text} onChange={(event) => setText(event.target.value)} rows={5} maxLength={600} className="min-h-32 w-full resize-y border-2 border-comun-black bg-white p-3 text-base text-comun-black outline-offset-2" placeholder="Ex.: a rua toda escura desde ontem à noite" />
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-comun-muted"><span>{text.length}/600</span><span>Até 3 perguntas de triagem</span></div>
            <button type="button" onClick={runTriage} className="min-h-12 w-full border-2 border-comun-black bg-comun-yellow px-4 py-3 text-sm font-black uppercase text-comun-black shadow-[4px_4px_0_#0b0b0a]">Organizar situação</button>
            {notice ? <p role="alert" className="border-l-4 border-comun-danger bg-white p-3 text-sm font-bold">{notice}</p> : null}
          </section>

          {needsHomeAnswer ? (
            <section className="grid gap-3 border-2 border-comun-black bg-white p-4" aria-labelledby="relata-question-title">
              <h2 id="relata-question-title" className="text-lg font-black">Uma pergunta antes de indicar o caminho</h2>
              <p className="text-base leading-7">{DARK_STREET_QUESTION}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => { setAnswer("sim"); setDecision(routeRelata({ text, answers: { homes_power: "sim" } })); }} className="min-h-12 border-2 border-comun-black bg-comun-paper px-4 py-3 text-left text-sm font-black">As casas também estão sem energia</button>
                <button type="button" onClick={() => { setAnswer("nao"); setDecision(routeRelata({ text, answers: { homes_power: "nao" } })); }} className="min-h-12 border-2 border-comun-black bg-comun-paper px-4 py-3 text-left text-sm font-black">Apenas as luminárias da rua</button>
              </div>
            </section>
          ) : null}

          {preview ? (
            <section className="grid gap-4 border-2 border-comun-black bg-comun-asphalt p-4 text-comun-paper shadow-[5px_5px_0_#f4c400]" aria-live="polite" data-comun-relata-preview="local-only">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-comun-yellow">Resultado de triagem</p><h2 className="mt-1 text-2xl font-black">{preview.decision.explanation}</h2></div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-black text-comun-yellow">Urgência</dt><dd>{preview.decision.urgency}</dd></div><div><dt className="font-black text-comun-yellow">Esfera responsável</dt><dd>{preview.decision.agencyKind}</dd></div><div><dt className="font-black text-comun-yellow">Privacidade</dt><dd>{preview.privacyClass}</dd></div><div><dt className="font-black text-comun-yellow">Próximo passo</dt><dd>{preview.decision.nextStep}</dd></div></dl>
              {preview.decision.missingInformation.length ? <div className="border-l-4 border-comun-yellow bg-comun-black/40 p-3 text-sm"><p className="font-black">Ainda falta confirmar</p><ul className="mt-1 list-disc pl-5">{preview.decision.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
              <div className="grid gap-2 border-2 border-comun-paper/40 p-3 text-sm"><p className="font-black">Protocolo COMUN local (preview)</p><p className="break-all font-mono text-comun-yellow">{preview.submission.protocol.value}</p><p>Este código não é protocolo oficial e não foi encaminhado a nenhuma instituição.</p><p className="font-black">Nenhum órgão público recebeu esta manifestação ainda.</p></div>
              <button type="button" onClick={() => { setDecision(null); setAnswer(undefined); setNotice(null); }} className="min-h-11 justify-self-start border-2 border-comun-paper px-4 py-2 text-sm font-black uppercase">Começar outro relato</button>
            </section>
          ) : null}

          <aside className="border-l-4 border-comun-yellow bg-white p-4 text-sm leading-6"><p className="font-black">Privacidade e limites</p><p>O preview não pede localização, anexo ou contato. Publicação, encaminhamento oficial e qualquer gravação ficam bloqueados até uma etapa futura com revisão humana e canais verificados.</p></aside>
        </main>
      </div>
    </ComunShell>
  );
}
