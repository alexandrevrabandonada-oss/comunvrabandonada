"use client";
import { useState } from "react";
export function MemorySuggestionForm({ itemId }: { itemId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setStatus("Enviando...");
    const response = await fetch("/api/comun/archive/suggestions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        archiveItemId: itemId,
        suggestionType: formData.get("suggestionType"),
        suggestionText: formData.get("suggestionText"),
        contributorAlias: formData.get("contributorAlias"),
        contactPrivate: formData.get("contactPrivate"),
        sourceReference: formData.get("sourceReference"),
        website: formData.get("website"),
        challengeAnswer: formData.get("challengeAnswer"),
      }),
    });
    const result = await response.json();
    setStatus(
      response.ok
        ? "Sugestao recebida para revisao humana. Ela nao altera a publicacao automaticamente."
        : result.error,
    );
  }
  return (
    <details className="mt-8 border-2 border-comun-yellow p-5">
      <summary className="cursor-pointer font-black uppercase text-comun-yellow">
        Ajude a completar esta memoria
      </summary>
      <form action={submit} className="mt-4 grid gap-3">
        <select name="suggestionType" className="p-3">
          <option value="date_correction">Corrigir data</option>
          <option value="place_identification">Identificar lugar</option>
          <option value="event_context">Contexto de evento</option>
          <option value="photographer_information">Informar autoria</option>
          <option value="source_information">Indicar fonte</option>
          <option value="person_information">Informacao sobre pessoa</option>
          <option value="historical_context">Contexto historico</option>
          <option value="other">Outro</option>
        </select>
        <textarea
          required
          minLength={10}
          name="suggestionText"
          placeholder="O que voce sabe sobre esta memoria?"
          className="min-h-28 p-3 text-comun-black"
        />
        <input
          name="sourceReference"
          placeholder="Fonte ou referencia"
          className="p-3 text-comun-black"
        />
        <input
          name="contributorAlias"
          placeholder="Nome ou apelido opcional"
          className="p-3 text-comun-black"
        />
        <input
          name="contactPrivate"
          placeholder="Contato privado opcional"
          className="p-3 text-comun-black"
        />
        <div className="hidden">
          <input name="website" tabIndex={-1} />
        </div>
        <label>
          Quanto e 3 + 4?{" "}
          <input
            required
            name="challengeAnswer"
            className="w-20 p-2 text-comun-black"
          />
        </label>
        <p className="text-sm">
          Informacoes sobre pessoas recebem revisao reforcada. Nao envie dados
          pessoais desnecessarios.
        </p>
        <button className="bg-comun-yellow p-3 font-black uppercase text-comun-black">
          Enviar para moderacao
        </button>
        {status ? <p>{status}</p> : null}
      </form>
    </details>
  );
}
