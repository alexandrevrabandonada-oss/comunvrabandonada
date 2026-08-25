"use client";
import { useState } from "react";

export function PhotoSubmissionForm({ progressiveRightsEnabled = false }: { progressiveRightsEnabled?: boolean }) {
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [protocol, setProtocol] = useState<string | null>(null),
    [duplicate, setDuplicate] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const file = formData.get("photo") as File;
      if (!file?.size) throw new Error("Escolha uma fotografia.");
      const payload = Object.fromEntries(
        [...formData.entries()].filter(([key]) => key !== "photo"),
      );
      Object.assign(payload, {
        permissionConfirmed: formData.get("permissionConfirmed") === "on",
        contactAuthorized: formData.get("contactAuthorized") === "on",
      });
      setProgress("Registrando a contribuicao...");
      let response = await fetch("/api/comun/archive/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      let result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setProgress("Enviando o original para preservacao privada...");
      response = await fetch(
        `/api/comun/archive/submissions/${result.submissionId}/upload-url`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        },
      );
      const upload = await response.json();
      if (!response.ok) throw new Error(upload.error);
      response = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("O envio da fotografia falhou.");
      setProgress("Validando o original recebido...");
      response = await fetch(
        `/api/comun/archive/submissions/${result.submissionId}/confirm`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assetId: upload.assetId }),
        },
      );
      const confirmed = await response.json();
      if (!response.ok) throw new Error(confirmed.error);
      setProtocol(result.protocol);
      setDuplicate(Boolean(confirmed.duplicate));
      setProgress("Contribuicao recebida.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nao foi possivel concluir o envio.",
      );
      setProtocol(null);
    } finally {
      setBusy(false);
    }
  }
  if (protocol)
    return (
      <div className="border-2 border-comun-yellow bg-comun-black p-6 text-comun-paper">
        <p className="font-black uppercase text-comun-yellow">
          Recebemos sua fotografia
        </p>
        <h2 className="mt-2 text-2xl font-black">Protocolo {protocol}</h2>
        <p className="mt-3">
          O original foi preservado em area privada. A equipe verificara fonte,
          direitos, contexto e criara uma versao publica leve antes de qualquer
          publicacao.
        </p>
        {duplicate ? (
          <p className="mt-3 border border-comun-yellow p-3">
            O arquivo parece identico a outro ja recebido. A nova historia e
            procedencia serao preservadas para revisao.
          </p>
        ) : null}
      </div>
    );
  return (
    <form action={submit} className="grid gap-6">
      <fieldset className="paper-panel grid gap-3 p-5">
        <legend className="font-black uppercase">1. Sobre a fotografia</legend>
        <input
          required
          name="titleSuggestion"
          placeholder="Titulo sugerido"
          className="border-2 border-comun-black p-3"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            name="city"
            placeholder="Cidade"
            className="border-2 border-comun-black p-3"
          />
          <input
            name="neighborhood"
            placeholder="Bairro"
            className="border-2 border-comun-black p-3"
          />
          <input
            name="placeName"
            placeholder="Lugar"
            className="border-2 border-comun-black p-3"
          />
          <input
            name="approximateDate"
            placeholder="Data ou decada aproximada"
            className="border-2 border-comun-black p-3"
          />
        </div>
        <textarea
          required
          minLength={10}
          name="descriptionSuggestion"
          placeholder="Historia e contexto"
          className="min-h-32 border-2 border-comun-black p-3"
        />
        <input
          name="photographerName"
          placeholder="Autor ou fotografo, se conhecido"
          className="border-2 border-comun-black p-3"
        />
      </fieldset>
      <fieldset className="paper-panel grid gap-3 p-5">
        <legend className="font-black uppercase">2. Origem e direitos</legend>
        <textarea
          required
          name="relationshipToMaterial"
          placeholder="Como voce se relaciona com este material?"
          className="border-2 border-comun-black p-3"
        />
        <input
          required
          name="sourceName"
          placeholder="Fonte da fotografia"
          className="border-2 border-comun-black p-3"
        />
        <textarea
          name="sourceStory"
          placeholder="Como a fotografia chegou ate voce?"
          className="border-2 border-comun-black p-3"
        />
        {progressiveRightsEnabled ? <>
          <label>Como este material chegou até você?
            <select required name="rightsBasis" defaultValue="" className="border-2 border-comun-black p-3">
              <option value="" disabled>Escolha uma situação</option>
              <option value="own_creation">Eu produzi o material</option>
              <option value="authorized_by_rightsholder">Tenho autorização do titular</option>
              <option value="public_official_material">É material público/oficial, sem presumir licença privada</option>
              <option value="historical_unknown">Material histórico; titular ainda não identificado</option>
              <option value="third_party_unverified">É de terceiro e ainda não tenho confirmação suficiente</option>
            </select>
          </label>
          <label>O que você autoriza nesta etapa?
            <select required name="publicationScope" defaultValue="review_only" className="border-2 border-comun-black p-3">
              <option value="review_only">Somente avaliação privada</option>
              <option value="comun_display">Exibição futura no Acervo, após revisão</option>
              <option value="comun_display_and_reuse">Exibição e reutilização conforme licença informada</option>
            </select>
          </label>
          <label>Reutilização fora da exibição
            <select required name="reusePermission" defaultValue="not_defined" className="border-2 border-comun-black p-3">
              <option value="not_defined">Ainda não definida</option>
              <option value="comun_only">Somente usos definidos pelo COMUN</option>
              <option value="licensed_reuse">Permitida sob a licença informada</option>
            </select>
          </label>
          <label>Licença existente, se houver
            <select name="licenseCode" defaultValue="not_defined" className="border-2 border-comun-black p-3">
              <option value="not_defined">Não definida</option><option value="none">Sem licença de reutilização</option><option value="cc_by_4_0">CC BY 4.0</option><option value="cc_by_sa_4_0">CC BY-SA 4.0</option><option value="external_license">Licença externa; será conferida</option>
            </select>
          </label>
          <p className="border-l-4 border-comun-yellow pl-3 text-sm">Guardar não autoriza publicação nem reutilização. Material de terceiro ou de autoria desconhecida permanece em revisão de direitos.</p>
        </> : <>
          <textarea required name="rightsDeclaration" placeholder="Explique por que voce pode compartilhar este material" className="border-2 border-comun-black p-3" />
          <label className="flex gap-2"><input required type="checkbox" name="permissionConfirmed" /> Confirmo que posso compartilhar esta fotografia para avaliacao.</label>
        </>}
        <select
          name="contributorCreditPreference"
          defaultValue="anonymous"
          className="border-2 border-comun-black p-3"
        >
          <option value="anonymous">Credito anonimo</option>
          <option value="contributor_name">Meu nome</option>
          <option value="custom_credit">Credito personalizado</option>
        </select>
        <input
          name="publicCredit"
          placeholder="Credito personalizado, se aplicavel"
          className="border-2 border-comun-black p-3"
        />
      </fieldset>
      <fieldset className="paper-panel grid gap-3 p-5">
        <legend className="font-black uppercase">3. Arquivo</legend>
        <input
          required
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
        />
        <p className="text-sm">
          Uma fotografia por contribuicao. JPEG, PNG ou WebP, ate 20 MB. O
          original nunca e publicado diretamente.
        </p>
      </fieldset>
      <fieldset className="paper-panel grid gap-3 p-5">
        <legend className="font-black uppercase">4. Contato opcional</legend>
        <input
          name="contributorName"
          placeholder="Nome"
          className="border-2 border-comun-black p-3"
        />
        <input
          name="contributorContactPrivate"
          placeholder="E-mail ou telefone privado"
          className="border-2 border-comun-black p-3"
        />
        <label className="flex gap-2">
          <input type="checkbox" name="contactAuthorized" /> A equipe pode
          entrar em contato para esclarecer informacoes.
        </label>
      </fieldset>
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} />
        </label>
      </div>
      <label className="paper-panel p-5">
        Desafio: quanto e 3 + 4?
        <input
          required
          name="challengeAnswer"
          inputMode="numeric"
          className="ml-3 w-20 border-2 border-comun-black p-2"
        />
      </label>
      {error ? (
        <p className="border-2 border-red-700 bg-red-50 p-3 text-red-800">
          {error}
        </p>
      ) : null}
      <button
        disabled={busy}
        className="min-h-12 bg-comun-yellow px-5 font-black uppercase text-comun-black disabled:opacity-60"
      >
        {busy ? progress : "Enviar fotografia para avaliacao"}
      </button>
      <p className="text-sm text-comun-paper/70">
        O envio nao garante publicacao. Todo material passa por curadoria
        humana.
      </p>
    </form>
  );
}
