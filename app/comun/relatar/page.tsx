"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { submitReport } from "@/app/actions";
import { communities, issues } from "@/lib/seed-data";

const steps = ["Tema", "O que aconteceu", "Anexos", "Seguranca", "Revisao"];

export default function ReportPage() {
  const [state, action] = useFormState(submitReport, null);
  const [step, setStep] = useState(0);
  const [communitySlug, setCommunitySlug] = useState("trabalho");
  const relatedIssues = useMemo(() => issues.filter((issue) => issue.communitySlug === communitySlug), [communitySlug]);

  return (
    <main className="min-h-screen bg-comun-paper px-4 py-5 text-comun-black">
      <div className="mx-auto max-w-2xl">
        <Link href="/comun" className="text-sm font-black uppercase">COMUN VR ABANDONADA</Link>
        <h1 className="mt-4 text-3xl font-black uppercase leading-none">Enviar relato com seguranca</h1>
        <p className="mt-3 text-sm text-comun-asphalt/75">
          O relato bruto fica interno. Publicacao, quando autorizada, passa por curadoria e sanitizacao.
        </p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`min-h-11 shrink-0 border-2 border-comun-black px-3 text-xs font-black uppercase ${
                step === index ? "bg-comun-yellow" : "bg-white"
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        <form action={action} className="mt-5 grid gap-5">
          {state?.error ? <div className="border-2 border-comun-red bg-white p-3 text-sm font-bold text-comun-red">{state.error}</div> : null}

          <section className={step === 0 ? "grid gap-4" : "hidden"}>
            <h2 className="text-xl font-black uppercase">Sobre o que e seu relato?</h2>
            <div className="grid gap-3">
              {communities.map((community) => (
                <label key={community.slug} className="flex min-h-14 items-start gap-3 border-2 border-comun-black bg-white p-3">
                  <input
                    type="radio"
                    name="community_slug"
                    value={community.slug}
                    checked={communitySlug === community.slug}
                    onChange={() => setCommunitySlug(community.slug)}
                    className="mt-1 h-5 w-5"
                  />
                  <span>
                    <strong className="block uppercase">{community.name}</strong>
                    <span className="text-sm text-comun-asphalt/70">{community.shortDescription}</span>
                  </span>
                </label>
              ))}
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase">Pauta relacionada, se fizer sentido</span>
                <select name="issue_slug" className="min-h-12 border-2 border-comun-black bg-white px-3">
                  <option value="">Ainda nao sei</option>
                  {relatedIssues.map((issue) => <option key={issue.slug} value={issue.slug}>{issue.title}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className={step === 1 ? "grid gap-4" : "hidden"}>
            <h2 className="text-xl font-black uppercase">O que aconteceu?</h2>
            <p className="text-sm text-comun-asphalt/75">Conte do seu jeito. Voce nao precisa escrever bonito. O importante e explicar o que aconteceu.</p>
            <Field name="title" label="Titulo curto opcional" />
            <TextArea name="raw_text" label="Relato principal" required />
            <Field name="period_text" label="Periodo aproximado" placeholder="Ex.: marco de 2026, semana passada, ha meses" />
            <Field name="neighborhood" label="Bairro" />
            <Field name="approximate_location" label="Local aproximado" placeholder="Sem endereco completo" />
            <Field name="involved_entity" label="Empresa, orgao ou servico envolvido opcional" />
          </section>

          <section className={step === 2 ? "grid gap-4" : "hidden"}>
            <h2 className="text-xl font-black uppercase">Provas e anexos</h2>
            <div className="border-2 border-comun-black bg-white p-4">
              <p className="font-bold">Envio de anexos sera liberado em breve.</p>
              <p className="mt-2 text-sm text-comun-asphalt/75">Evite enviar CPF, telefone, endereco completo ou dados de pessoas que nao autorizaram.</p>
            </div>
          </section>

          <section className={step === 3 ? "grid gap-4" : "hidden"}>
            <h2 className="text-xl font-black uppercase">Seguranca</h2>
            <Check name="is_anonymous" label="Quero enviar de forma anonima" defaultChecked />
            <Check name="can_publish_sanitized" label="O VR Abandonada pode publicar uma versao sanitizada do relato" />
            <Check name="accepts_contact" label="A equipe pode me procurar se precisar entender melhor" />
            <Field name="private_contact" label="Contato privado opcional" placeholder="WhatsApp ou e-mail" />
          </section>

          <section className={step === 4 ? "grid gap-4" : "hidden"}>
            <h2 className="text-xl font-black uppercase">Revisao</h2>
            <div className="border-2 border-comun-black bg-white p-4 text-sm">
              <p className="font-black uppercase text-comun-red">Antes de enviar</p>
              <p className="mt-2">Confira se voce nao incluiu CPF, telefone, endereco completo ou dados de terceiros no texto do relato.</p>
            </div>
            <button className="min-h-14 border-2 border-comun-black bg-comun-yellow px-5 text-base font-black uppercase shadow-[4px_4px_0_#0b0b0a]">
              Enviar relato
            </button>
          </section>
        </form>

        <div className="sticky bottom-0 mt-6 grid grid-cols-2 gap-3 border-t-2 border-comun-black bg-comun-paper py-3">
          <button type="button" onClick={() => setStep(Math.max(0, step - 1))} className="min-h-12 border-2 border-comun-black bg-white font-black uppercase">Voltar</button>
          <button type="button" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} className="min-h-12 border-2 border-comun-black bg-comun-black font-black uppercase text-comun-yellow">Continuar</button>
        </div>
      </div>
    </main>
  );
}

function Field({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black uppercase">{label}</span>
      <input name={name} placeholder={placeholder} className="min-h-12 border-2 border-comun-black bg-white px-3" />
    </label>
  );
}

function TextArea({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black uppercase">{label}</span>
      <textarea name={name} required={required} rows={8} className="border-2 border-comun-black bg-white p-3" />
    </label>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-14 items-center gap-3 border-2 border-comun-black bg-white p-3 font-bold">
      <input type="checkbox" name={name} value="true" defaultChecked={defaultChecked} className="h-6 w-6" />
      {label}
    </label>
  );
}
