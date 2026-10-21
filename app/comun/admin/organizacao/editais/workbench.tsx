"use client";

import { useMemo, useState } from "react";
import {
  buildEditaisR0Preparation,
  detectEditaisR0Mentions,
  MAX_EDITAL_R0_TEXT_LENGTH,
  type EditaisR0ChecklistId,
  type EditaisR0Evidence,
} from "@/lib/comun-editais-r0";

/**
 * Bancada R0: somente estado efêmero no navegador.
 * Nunca chama API, armazena anexo, aciona portal ou envia candidatura.
 */
export function EditaisR0Workbench() {
  const [organization, setOrganization] = useState("APS — razão social a confirmar");
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editalText, setEditalText] = useState("");
  const [evidence, setEvidence] = useState<EditaisR0Evidence>({});
  const [copyMessage, setCopyMessage] = useState("");

  const mentions = useMemo(
    () => detectEditaisR0Mentions(editalText),
    [editalText],
  );

  const report = useMemo(
    () =>
      buildEditaisR0Preparation(
        { organization, title, issuer, sourceUrl, deadline },
        editalText,
        evidence,
      ),
    [organization, title, issuer, sourceUrl, deadline, editalText, evidence],
  );

  function changeEvidence(id: EditaisR0ChecklistId, value: string) {
    setEvidence((previous) => ({ ...previous, [id]: value }));
    setCopyMessage("");
  }

  async function copyReport() {
    try {
      if (!navigator.clipboard) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(report);
      setCopyMessage("Dossiê preliminar copiado. Ele ainda precisa de revisão.");
    } catch {
      setCopyMessage("Cópia automática indisponível. Selecione o texto do dossiê abaixo.");
    }
  }

  return (
    <div className="mt-5 space-y-7">
      <p className="border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-black">
        <strong>Somente diagnóstico.</strong> Os dados são mantidos nesta página,
        em memória, e perdidos ao fechá-la. Não insira senhas, CPF, dados bancários
        ou anexos pessoais. Nenhuma inscrição é enviada.
      </p>

      <section aria-labelledby="edital-r0-data" className="border-2 border-black bg-white p-4 text-black">
        <h2 id="edital-r0-data" className="text-xl font-black uppercase">1. Identifique o edital</h2>
        <p className="mt-1 text-sm">Informações informadas pelo operador, ainda não verificadas.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold">
            Organização proponente
            <input className="w-full border-2 border-black p-2 font-normal" maxLength={160}
              value={organization} onChange={(event) => setOrganization(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Título do edital
            <input className="w-full border-2 border-black p-2 font-normal" maxLength={200}
              placeholder="Nome oficial da chamada" value={title}
              onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Órgão ou instituição responsável
            <input className="w-full border-2 border-black p-2 font-normal" maxLength={160}
              value={issuer} onChange={(event) => setIssuer(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Prazo informado (confirmar horário e fuso)
            <input className="w-full border-2 border-black p-2 font-normal" type="date"
              value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-bold md:col-span-2">
            Endereço da fonte oficial (texto; não acessado pelo sistema)
            <input className="w-full border-2 border-black p-2 font-normal" type="text"
              placeholder="https://..." maxLength={1000} value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)} />
          </label>
        </div>
        <label className="mt-4 grid gap-1 text-sm font-bold">
          Texto público do edital (sem credenciais ou dados pessoais)
          <textarea className="min-h-44 w-full border-2 border-black p-3 font-normal" rows={9}
            maxLength={MAX_EDITAL_R0_TEXT_LENGTH}
            placeholder="Cole aqui o texto do edital e das retificações. O R0 não lê PDF automaticamente."
            value={editalText} onChange={(event) => setEditalText(event.target.value)} />
        </label>
        <p className="mt-1 text-xs">
          {editalText.length.toLocaleString("pt-BR")} / {MAX_EDITAL_R0_TEXT_LENGTH.toLocaleString("pt-BR")} caracteres.
          A leitura automática identifica apenas menções, não interpreta obrigações.
        </p>
      </section>

      <section aria-labelledby="edital-r0-checklist" className="border-2 border-black bg-white p-4 text-black">
        <h2 id="edital-r0-checklist" className="text-xl font-black uppercase">2. Conferência humana</h2>
        <p className="mt-1 text-sm">
          Menções no texto são pistas. Uma exigência pode aparecer negada, em anexo
          ou em retificação. Nenhum item é considerado cumprido automaticamente.
        </p>
        <div className="mt-4 grid gap-3">
          {mentions.map((item, index) => (
            <div className="border border-neutral-400 p-3" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-bold">{index + 1}. {item.title}</h3>
                <span className="bg-neutral-100 px-2 py-1 text-xs font-bold">
                  {item.mentioned ? "Menção encontrada" : "Sem menção identificada"}
                </span>
              </div>
              <p className="mt-1 text-sm">{item.question}</p>
              <label className="mt-2 grid gap-1 text-sm">
                Referência documental para conferir (não significa validação)
                <input className="w-full border border-neutral-500 p-2"
                  maxLength={300} placeholder="Ex.: certidão, página 7 do edital, pasta interna"
                  value={evidence[item.id] ?? ""}
                  onChange={(event) => changeEvidence(item.id, event.target.value)} />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="edital-r0-output" className="border-2 border-black bg-white p-4 text-black">
        <h2 id="edital-r0-output" className="text-xl font-black uppercase">3. Dossiê preliminar</h2>
        <p className="mt-1 text-sm">
          Copie para a fase de revisão. A proposta, a elegibilidade e os documentos
          continuam pendentes; este texto não é um formulário final.
        </p>
        <button className="mt-3 border-2 border-black bg-black px-4 py-2 font-bold text-white"
          type="button" onClick={copyReport}>Copiar dossiê preliminar</button>
        <p role="status" aria-live="polite" className="mt-2 text-sm">{copyMessage}</p>
        <label className="mt-3 grid gap-1 text-sm font-bold">
          Texto para revisão
          <textarea readOnly className="min-h-64 w-full border-2 border-neutral-500 p-3 font-mono text-xs font-normal"
            rows={19} value={report} />
        </label>
        <p className="mt-2 text-sm font-bold">
          Estado: rascunho local. Elegibilidade indeterminada. Sem envio ou protocolo.
        </p>
      </section>
    </div>
  );
}
