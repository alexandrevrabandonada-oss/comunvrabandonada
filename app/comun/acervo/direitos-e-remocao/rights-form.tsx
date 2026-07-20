"use client";
import { useState } from "react";
export function RightsForm() {
  const [message, setMessage] = useState<string | null>(null);
  async function submit(formData: FormData) {
    const response = await fetch("/api/comun/archive/rights-removal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const result = await response.json();
    setMessage(
      response.ok ? `Solicitacao registrada: ${result.protocol}` : result.error,
    );
  }
  return (
    <form action={submit} className="mt-6 grid gap-3 paper-panel p-5">
      <select name="requestType" aria-label="Tipo de solicitação">
        <option value="correction">Correcao</option>
        <option value="credit">Credito</option>
        <option value="removal">Retirada</option>
      </select>
      <input
        name="archiveItemId"
        placeholder="ID do item, se souber"
        className="border-2 border-comun-black p-3"
      />
      <input
        required
        name="contact"
        placeholder="Contato privado para retorno"
        className="border-2 border-comun-black p-3"
      />
      <textarea
        required
        minLength={10}
        name="reason"
        placeholder="Explique a solicitacao"
        className="min-h-32 border-2 border-comun-black p-3"
      />
      <div className="hidden">
        <input name="website" tabIndex={-1} />
      </div>
      <button className="bg-comun-yellow p-3 font-black uppercase">
        Enviar solicitacao
      </button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
