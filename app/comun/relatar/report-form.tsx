"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { ArrowLeft, ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { submitReport } from "@/app/actions";
import { issues } from "@/lib/seed-data";

const steps = ["Tema", "O que aconteceu", "Provas", "Seguranca", "Revisao"] as const;

const topicOptions = [
  {
    value: "trabalho",
    submitValue: "trabalho",
    label: "Trabalho e Burnout",
    description: "Adoecimento no trabalho, assedio, metas, atraso de direitos, pressao e jornada abusiva.",
  },
  {
    value: "escolas",
    submitValue: "escolas",
    label: "Escolas e Educacao",
    description: "Estrutura, falta de profissionais, merenda, transporte, calor e rotina escolar.",
  },
  {
    value: "saude",
    submitValue: "saude",
    label: "Saude Publica",
    description: "Fila de exames, cirurgias, hospitais, UBS, falta de atendimento e espera.",
  },
  {
    value: "meio-ambiente",
    submitValue: "meio-ambiente",
    label: "Meio Ambiente",
    description: "Po preto, fumaca, cheiro forte, agua, barulho, escoria e impactos ambientais.",
  },
  {
    value: "cidade",
    submitValue: "cidade",
    label: "Cidade e Servicos Publicos",
    description: "Buracos, calcadas, lixo, transporte, iluminacao, enchentes, abandono e servicos.",
  },
  {
    value: "outro",
    submitValue: "cidade",
    label: "Outro tema",
    description: "Se nao couber nas categorias acima, descreva no relato. A curadoria classifica depois.",
  },
] as const satisfies ReadonlyArray<{
  value: "trabalho" | "escolas" | "saude" | "meio-ambiente" | "cidade" | "outro";
  submitValue: "trabalho" | "escolas" | "saude" | "meio-ambiente" | "cidade";
  label: string;
  description: string;
}>;

const workCampaignCategories = [
  "pressao-psicologica",
  "assedio-moral",
  "burnout",
  "atraso-salarial",
  "fgts-atrasado",
  "terceirizacao",
  "jornada-abusiva",
  "ferias-impostas",
  "risco-de-acidente",
  "insalubridade-periculosidade",
  "medo-de-denunciar",
  "retaliacao",
] as const;

const categoryLabels: Record<(typeof workCampaignCategories)[number], string> = {
  "pressao-psicologica": "Pressao psicologica",
  "assedio-moral": "Assedio moral",
  burnout: "Burnout",
  "atraso-salarial": "Atraso salarial",
  "fgts-atrasado": "FGTS atrasado",
  terceirizacao: "Terceirizacao",
  "jornada-abusiva": "Jornada abusiva",
  "ferias-impostas": "Ferias impostas",
  "risco-de-acidente": "Risco de acidente",
  "insalubridade-periculosidade": "Insalubridade/periculosidade",
  "medo-de-denunciar": "Medo de denunciar",
  retaliacao: "Retaliacao",
};

const quickCategories = [
  {
    value: "buraco-calcada",
    label: "Buraco ou calcada",
    communitySlug: "cidade",
    issueSlug: "buracos-calcadas-abandono-bairros",
  },
  {
    value: "lixo-entulho",
    label: "Lixo ou entulho",
    communitySlug: "cidade",
    issueSlug: "buracos-calcadas-abandono-bairros",
  },
  {
    value: "poluicao-po-preto",
    label: "Poluicao ou po preto",
    communitySlug: "meio-ambiente",
    issueSlug: "po-preto-fumaca-cheiro-forte",
  },
  { value: "iluminacao", label: "Iluminacao", communitySlug: "cidade", issueSlug: "buracos-calcadas-abandono-bairros" },
  { value: "transporte", label: "Transporte", communitySlug: "cidade", issueSlug: "" },
  { value: "escola", label: "Escola", communitySlug: "escolas", issueSlug: "falta-profissionais-escolas" },
  { value: "saude", label: "Saude", communitySlug: "saude", issueSlug: "fila-cirurgias-exames" },
  { value: "trabalho", label: "Trabalho", communitySlug: "trabalho", issueSlug: "trabalho-burnout-volta-redonda" },
  { value: "outro", label: "Outro", communitySlug: "cidade", issueSlug: "" },
] as const;

type TopicChoice = (typeof topicOptions)[number]["value"];

type FormValues = {
  topicChoice: TopicChoice;
  issueSlug: string;
  reportCategory: string;
  title: string;
  rawText: string;
  periodText: string;
  neighborhood: string;
  approximateLocation: string;
  involvedEntity: string;
  isAnonymous: boolean;
  canPublishSanitized: boolean;
  acceptsContact: boolean;
  privateContact: string;
  quickCategory: (typeof quickCategories)[number]["value"];
  quickDescription: string;
  quickLocationText: string;
  latitude: string;
  longitude: string;
  locationAccuracy: string;
  locationSource: string;
};

type ReportFormProps = {
  initialCategory?: string;
  initialIssueSlug?: string;
  initialTopicChoice?: TopicChoice;
};

const initialValues: FormValues = {
  topicChoice: "trabalho",
  issueSlug: "",
  reportCategory: "",
  title: "",
  rawText: "",
  periodText: "",
  neighborhood: "",
  approximateLocation: "",
  involvedEntity: "",
  isAnonymous: true,
  canPublishSanitized: false,
  acceptsContact: false,
  privateContact: "",
  quickCategory: "buraco-calcada",
  quickDescription: "",
  quickLocationText: "",
  latitude: "",
  longitude: "",
  locationAccuracy: "",
  locationSource: "",
};

function getSubmitCommunitySlug(topicChoice: TopicChoice) {
  return topicOptions.find((option) => option.value === topicChoice)?.submitValue ?? "trabalho";
}

function getTopicLabel(topicChoice: TopicChoice) {
  return topicOptions.find((option) => option.value === topicChoice)?.label ?? "Tema nao informado";
}

export function ReportForm({
  initialCategory = "",
  initialIssueSlug = "",
  initialTopicChoice = "trabalho",
}: ReportFormProps) {
  const [state, action] = useFormState(submitReport, null);
  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>({
    ...initialValues,
    topicChoice: initialTopicChoice,
    issueSlug: initialIssueSlug,
    reportCategory: initialCategory,
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("comun_capture_draft_v1");
      if (!raw) return;
      const draft = JSON.parse(raw) as { text?: string; hasPrivateLocation?: boolean };
      // The draft is an external, user-owned resume source; hydrate once on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues((current) => ({
        ...current,
        rawText: typeof draft.text === "string" ? draft.text : current.rawText,
      }));
    } catch {
      // Rascunho local inválido não bloqueia o formulário detalhado.
    }
  }, []);

  const submitCommunitySlug = getSubmitCommunitySlug(values.topicChoice);
  const relatedIssues = useMemo(
    () => issues.filter((issue) => issue.communitySlug === submitCommunitySlug),
    [submitCommunitySlug],
  );
  const selectedIssue = relatedIssues.find((issue) => issue.slug === values.issueSlug) ?? null;
  const isWorkCampaign = values.issueSlug === "trabalho-burnout-volta-redonda" && values.topicChoice === "trabalho";
  const selectedQuickCategory =
    quickCategories.find((category) => category.value === values.quickCategory) ?? quickCategories[0];
  const [locationStatus, setLocationStatus] = useState("");

  function updateValue<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function nextStep() {
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  function previousStep() {
    setStep((current) => Math.max(0, current - 1));
  }

  function useApproximateLocation() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("Geolocalizacao nao disponivel neste aparelho. Preencha o local manualmente.");
      return;
    }

    setLocationStatus("Pedindo localizacao aproximada...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateValue("latitude", position.coords.latitude.toFixed(5));
        updateValue("longitude", position.coords.longitude.toFixed(5));
        updateValue("locationAccuracy", String(Math.round(position.coords.accuracy)));
        updateValue("locationSource", "browser_geolocation");
        setLocationStatus(`Localizacao capturada com precisao aproximada de ${Math.round(position.coords.accuracy)} m.`);
      },
      () => {
        setLocationStatus("Localizacao nao autorizada. Voce pode preencher o local manualmente.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-comun-paper px-4 py-5 text-comun-black">
      <div className="mx-auto max-w-3xl">
        <Link href="/comun" className="text-sm font-black uppercase">
          COMUN VR ABANDONADA
        </Link>
        <h1 className="mt-4 text-3xl font-black uppercase leading-none sm:text-4xl">Enviar relato com seguranca</h1>
        <p className="mt-3 max-w-2xl text-sm text-comun-asphalt/75 sm:text-base">
          O relato bruto fica interno. Publicacao, quando autorizada, passa por curadoria e sanitizacao.
        </p>
        {isWorkCampaign ? (
          <div className="mt-4 border-2 border-comun-black bg-comun-yellow/20 p-4">
            <p className="font-black uppercase">Campanha-piloto: Trabalho e Burnout em Volta Redonda</p>
            <p className="mt-2 text-sm text-comun-asphalt/80">
              Voce pode relatar sem se identificar publicamente. Se autorizar publicacao, a equipe pode remover dados
              pessoais antes de qualquer divulgacao.
            </p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 border-2 border-comun-black bg-white p-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`min-h-12 border-2 border-comun-black px-4 text-sm font-black uppercase ${
              mode === "quick" ? "bg-comun-yellow" : "bg-white"
            }`}
          >
            Relato rapido
          </button>
          <button
            type="button"
            onClick={() => setMode("detailed")}
            className={`min-h-12 border-2 border-comun-black px-4 text-sm font-black uppercase ${
              mode === "detailed" ? "bg-comun-yellow" : "bg-white"
            }`}
          >
            Relato detalhado
          </button>
          <p className="text-sm font-medium text-comun-asphalt/75 sm:col-span-2">
            Relato rapido e para buraco, lixo, fumaca, calcada, iluminacao ou problema visto na rua. O detalhado continua disponivel para casos que precisam de mais contexto.
          </p>
        </div>

        <div className={mode === "detailed" ? "mt-5 grid grid-cols-1 gap-2 sm:grid-cols-5" : "hidden"}>
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`min-h-12 border-2 border-comun-black px-3 text-xs font-black uppercase ${
                step === index ? "bg-comun-yellow" : "bg-white"
              } leading-tight`}
              aria-current={step === index ? "step" : undefined}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        <form action={action} className="mt-5 grid gap-5">
          <input type="hidden" name="quick_report" value={mode === "quick" ? "true" : "false"} />
          <input type="hidden" name="community_slug" value={mode === "quick" ? selectedQuickCategory.communitySlug : submitCommunitySlug} />
          <input type="hidden" name="issue_slug" value={mode === "quick" ? selectedQuickCategory.issueSlug : values.issueSlug} />
          <input type="hidden" name="quick_category" value={mode === "quick" ? values.quickCategory : ""} />
          <input type="hidden" name="latitude" value={values.latitude} />
          <input type="hidden" name="longitude" value={values.longitude} />
          <input type="hidden" name="location_accuracy" value={values.locationAccuracy} />
          <input type="hidden" name="location_source" value={values.locationSource} />

          {state?.error ? (
            <div className="border-2 border-comun-red bg-white p-3 text-sm font-bold text-comun-red">{state.error}</div>
          ) : null}

          <fieldset disabled={mode !== "quick"} className={mode === "quick" ? "grid gap-5" : "hidden"}>
            <header className="grid gap-2 border-2 border-comun-black bg-comun-yellow/20 p-4">
              <h2 className="text-xl font-black uppercase">Relato rapido</h2>
              <p className="text-sm text-comun-asphalt/75">
                Vi um problema, tirei foto, informei local aproximado e mandei. Nada e publicado automaticamente.
              </p>
            </header>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-black uppercase">Categoria rapida</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {quickCategories.map((category) => (
                  <label key={category.value} className="flex min-h-12 items-center gap-3 border-2 border-comun-black bg-white p-3 font-black">
                    <input
                      type="radio"
                      name="quick_category_choice"
                      value={category.value}
                      checked={values.quickCategory === category.value}
                      onChange={() => updateValue("quickCategory", category.value)}
                      className="h-5 w-5"
                    />
                    <span>{category.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2">
              <span className="text-sm font-black uppercase">Foto opcional</span>
              <input
                type="file"
                name="report_photo"
                accept="image/*"
                capture="environment"
                className="min-h-12 border-2 border-comun-black bg-white p-3 text-sm"
              />
              <span className="text-sm font-bold text-comun-asphalt/70">
                A foto ajuda a comprovar, mas nao publique dados pessoais sem cuidado. Ela fica privada para curadoria.
              </span>
            </label>

            <div className="grid gap-3 border-2 border-comun-black bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black uppercase">Localizacao aproximada</p>
                  <p className="mt-1 text-sm text-comun-asphalt/75">
                    Use apenas se estiver confortavel. A localizacao publica sera tratada com cuidado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={useApproximateLocation}
                  className="min-h-12 border-2 border-comun-black bg-comun-yellow px-4 text-sm font-black uppercase"
                >
                  Usar minha localizacao aproximada
                </button>
              </div>
              {locationStatus ? <p className="text-sm font-bold text-comun-asphalt/75">{locationStatus}</p> : null}
              {values.latitude && values.longitude ? (
                <p className="text-xs font-bold uppercase text-comun-asphalt/60">
                  Local interno capturado: {values.latitude}, {values.longitude}
                </p>
              ) : null}
              <Field
                name="approximate_location"
                label="Local manual, se preferir"
                placeholder="Ex.: perto da escola, proximo ao ponto de onibus"
                value={values.quickLocationText}
                onChange={(value) => {
                  updateValue("quickLocationText", value);
                  updateValue("approximateLocation", value);
                  if (value && !values.locationSource) updateValue("locationSource", "manual");
                }}
              />
            </div>

            <TextArea
              name="raw_text"
              label="Descricao curta"
              required
              minLength={8}
              rows={5}
              placeholder="Ex: buraco grande na calcada perto da escola, risco de queda."
              value={values.quickDescription}
              onChange={(value) => updateValue("quickDescription", value)}
            />

            <div className="grid gap-3">
              <Check
                name="is_anonymous"
                label="Enviar de forma anonima"
                helper="Padrao recomendado para relato rapido."
                checked={values.isAnonymous}
                onChange={(value) => updateValue("isAnonymous", value)}
              />
              <Check
                name="can_publish_sanitized"
                label="Autorizar publicacao sanitizada"
                helper="A equipe remove dados sensiveis antes de qualquer publicacao."
                checked={values.canPublishSanitized}
                onChange={(value) => updateValue("canPublishSanitized", value)}
              />
              <Check
                name="accepts_contact"
                label="A equipe pode te procurar?"
                helper="Contato fica interno e nunca aparece publicamente."
                checked={values.acceptsContact}
                onChange={(value) => updateValue("acceptsContact", value)}
              />
              <Field
                name="private_contact"
                label="Contato opcional"
                placeholder="WhatsApp ou e-mail"
                value={values.privateContact}
                onChange={(value) => updateValue("privateContact", value)}
                disabled={!values.acceptsContact}
              />
            </div>

            <input type="hidden" name="title" value="" />
            <input type="hidden" name="period_text" value="" />
            <input type="hidden" name="neighborhood" value="" />
            <input type="hidden" name="involved_entity" value="" />
            <button className="min-h-14 border-2 border-comun-black bg-comun-yellow px-5 text-base font-black uppercase shadow-[4px_4px_0_#0b0b0a]">
              Enviar relato rapido
            </button>
          </fieldset>

          <fieldset disabled={mode !== "detailed"} className={mode === "detailed" && step === 0 ? "grid gap-4" : "hidden"}>
            <header className="grid gap-2">
              <h2 className="text-xl font-black uppercase">1. Sobre o que e seu relato?</h2>
              <p className="text-sm text-comun-asphalt/75">
                Escolha o tema mais proximo. Se ainda nao houver categoria certa, use <strong>Outro tema</strong>.
              </p>
            </header>

            <div className="grid gap-3">
              {topicOptions.map((option) => (
                <label key={option.value} className="flex min-h-16 items-start gap-3 border-2 border-comun-black bg-white p-3">
                  <input
                    type="radio"
                    name="topic_choice"
                    value={option.value}
                    checked={values.topicChoice === option.value}
                    onChange={() => {
                      updateValue("topicChoice", option.value);
                      updateValue("issueSlug", "");
                      updateValue("reportCategory", "");
                    }}
                    className="mt-1 h-5 w-5"
                  />
                  <span className="min-w-0">
                    <strong className="comun-prose block uppercase">{option.label}</strong>
                    <span className="comun-prose text-sm text-comun-asphalt/70">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-black uppercase">Pauta relacionada, se fizer sentido</span>
              <select
                value={values.issueSlug}
                onChange={(event) => {
                  const nextIssueSlug = event.target.value;
                  updateValue("issueSlug", nextIssueSlug);
                  if (nextIssueSlug !== "trabalho-burnout-volta-redonda") {
                    updateValue("reportCategory", "");
                  }
                }}
                className="min-h-12 border-2 border-comun-black bg-white px-3"
                disabled={values.topicChoice === "outro"}
              >
                <option value="">Ainda nao sei</option>
                {relatedIssues.map((issue) => (
                  <option key={issue.slug} value={issue.slug}>
                    {issue.title}
                  </option>
                ))}
              </select>
            </label>

            {isWorkCampaign ? (
              <label className="grid gap-2">
                <span className="text-sm font-black uppercase">Categoria principal da campanha</span>
                <select
                  name="campaign_category"
                  value={values.reportCategory}
                  onChange={(event) => updateValue("reportCategory", event.target.value)}
                  className="min-h-12 border-2 border-comun-black bg-white px-3"
                >
                  <option value="">Escolha a situacao mais proxima</option>
                  {workCampaignCategories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input type="hidden" name="campaign_category" value={values.reportCategory} />
            )}

            {values.topicChoice === "outro" ? (
              <div className="border-2 border-comun-black bg-comun-yellow/20 p-4 text-sm font-bold">
                A categoria final sera definida pela curadoria depois do envio.
              </div>
            ) : null}
          </fieldset>

          <fieldset disabled={mode !== "detailed"} className={mode === "detailed" && step === 1 ? "grid gap-4" : "hidden"}>
            <header className="grid gap-2">
              <h2 className="text-xl font-black uppercase">2. O que aconteceu?</h2>
              <p className="text-sm text-comun-asphalt/75">
                Conte do seu jeito. Voce nao precisa escrever bonito. O importante e explicar o que aconteceu.
              </p>
            </header>

            <Field
              name="title"
              label="Titulo curto opcional"
              value={values.title}
              onChange={(value) => updateValue("title", value)}
            />
            <TextArea
              name="raw_text"
              label="Relato principal"
              required
              value={values.rawText}
              onChange={(value) => updateValue("rawText", value)}
            />
            <Field
              name="period_text"
              label="Periodo aproximado"
              placeholder="Ex.: marco de 2026, semana passada, ha meses"
              value={values.periodText}
              onChange={(value) => updateValue("periodText", value)}
            />
            <Field
              name="neighborhood"
              label="Bairro"
              value={values.neighborhood}
              onChange={(value) => updateValue("neighborhood", value)}
            />
            <Field
              name="approximate_location"
              label="Bairro/local aproximado"
              placeholder="Sem endereco completo"
              value={values.approximateLocation}
              onChange={(value) => updateValue("approximateLocation", value)}
            />
            <Field
              name="involved_entity"
              label="Empresa, orgao ou servico envolvido, opcional"
              value={values.involvedEntity}
              onChange={(value) => updateValue("involvedEntity", value)}
            />
          </fieldset>

          <fieldset disabled={mode !== "detailed"} className={mode === "detailed" && step === 2 ? "grid gap-4" : "hidden"}>
            <header className="grid gap-2">
              <h2 className="text-xl font-black uppercase">3. Provas e anexos</h2>
              <p className="text-sm text-comun-asphalt/75">
                No modo detalhado, anexe foto apenas se ela ajudar a comprovar sem expor pessoas ou dados pessoais.
              </p>
            </header>

            <div className="border-2 border-comun-black bg-white p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 text-comun-rust" size={22} />
                <div>
                  <p className="font-black uppercase">Foto opcional privada</p>
                  <p className="mt-2 text-sm text-comun-asphalt/75">
                    Evite enviar CPF, telefone, endereco completo ou dados de pessoas que nao autorizaram.
                  </p>
                  <input
                    type="file"
                    name="report_photo"
                    accept="image/*"
                    capture="environment"
                    className="mt-3 min-h-12 w-full border-2 border-comun-black bg-white p-3 text-sm"
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset disabled={mode !== "detailed"} className={mode === "detailed" && step === 3 ? "grid gap-4" : "hidden"}>
            <header className="grid gap-2">
              <h2 className="text-xl font-black uppercase">4. Seguranca</h2>
              <p className="text-sm text-comun-asphalt/75">
                Escolha como o relato pode ser tratado. Nada entra publico automaticamente.
              </p>
            </header>

            <Check
              name="is_anonymous"
              label="Voce quer enviar de forma anonima?"
              helper="Seu nome nao precisa aparecer em nenhum momento publico."
              checked={values.isAnonymous}
              onChange={(value) => updateValue("isAnonymous", value)}
            />
            <Check
              name="can_publish_sanitized"
              label="O VR Abandonada pode publicar uma versao sanitizada do relato?"
              helper="Se houver publicacao, os dados sensiveis devem ser removidos antes."
              checked={values.canPublishSanitized}
              onChange={(value) => updateValue("canPublishSanitized", value)}
            />
            <Check
              name="accepts_contact"
              label="A equipe pode te procurar se precisar entender melhor?"
              helper="Seu contato fica interno e nunca aparece na parte publica."
              checked={values.acceptsContact}
              onChange={(value) => updateValue("acceptsContact", value)}
            />
            <Field
              name="private_contact"
              label="Contato opcional separado"
              placeholder="WhatsApp ou e-mail"
              value={values.privateContact}
              onChange={(value) => updateValue("privateContact", value)}
              disabled={!values.acceptsContact}
            />

            <div className="border-2 border-comun-black bg-comun-yellow/20 p-4 text-sm font-bold">
              Nunca coloque contato no texto principal do relato. Use apenas o campo de contato privado, se quiser.
            </div>
          </fieldset>

          <fieldset disabled={mode !== "detailed"} className={mode === "detailed" && step === 4 ? "grid gap-4" : "hidden"}>
            <header className="grid gap-2">
              <h2 className="text-xl font-black uppercase">5. Revisao</h2>
              <p className="text-sm text-comun-asphalt/75">
                Confira o resumo antes de enviar. O envio nao publica nada automaticamente.
              </p>
            </header>

            <div className="grid gap-4">
              <SummaryCard label="Tema" value={getTopicLabel(values.topicChoice)} />
              <SummaryCard label="Pauta relacionada" value={selectedIssue?.title ?? "Ainda nao definida"} />
              {isWorkCampaign ? (
                <SummaryCard
                  label="Categoria da campanha"
                  value={values.reportCategory ? getCategoryLabel(values.reportCategory) : "Nao informada"}
                />
              ) : null}
              <SummaryCard label="Titulo curto" value={values.title || "Nao informado"} />
              <SummaryCard label="Relato principal" value={values.rawText || "Ainda nao preenchido"} />
              <SummaryCard label="Periodo aproximado" value={values.periodText || "Nao informado"} />
              <SummaryCard
                label="Bairro/local aproximado"
                value={[values.neighborhood, values.approximateLocation].filter(Boolean).join(" - ") || "Nao informado"}
              />
              <SummaryCard label="Empresa, orgao ou servico" value={values.involvedEntity || "Nao informado"} />
              <SummaryCard label="Forma de envio" value={values.isAnonymous ? "Anonimo" : "Identificado internamente"} />
              <SummaryCard
                label="Autorizacao para publicacao sanitizada"
                value={values.canPublishSanitized ? "Sim" : "Nao"}
              />
              <SummaryCard label="Contato interno" value={values.acceptsContact ? values.privateContact || "Autorizado sem contato preenchido" : "Nao autorizado"} />
            </div>

            <div className="border-2 border-comun-black bg-white p-4 text-sm">
              <p className="font-black uppercase text-comun-rust">Antes de enviar</p>
              <p className="mt-2">
                Confira se voce nao incluiu CPF, telefone, endereco completo ou dados de terceiros no corpo do relato.
              </p>
            </div>

            <button className="min-h-14 border-2 border-comun-black bg-comun-yellow px-5 text-base font-black uppercase shadow-[4px_4px_0_#0b0b0a]">
              Enviar relato
            </button>
          </fieldset>
        </form>

        <div className={mode === "detailed" ? "sticky bottom-0 mt-6 grid grid-cols-1 gap-3 border-t-2 border-comun-black bg-comun-paper py-3 sm:grid-cols-2" : "hidden"}>
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 0}
            className="inline-flex min-h-12 items-center justify-center gap-2 border-2 border-comun-black bg-white px-3 text-center font-black uppercase disabled:opacity-50"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={step === steps.length - 1}
            className="inline-flex min-h-12 items-center justify-center gap-2 border-2 border-comun-black bg-comun-black px-3 text-center font-black uppercase text-comun-yellow disabled:opacity-50"
          >
            {step === steps.length - 2 ? "Ir para revisao" : "Continuar"}
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-3 border-2 border-comun-black bg-white p-4 text-sm">
          <ShieldCheck className="mt-0.5 text-comun-green" size={18} />
          <p>
            Relatos recebidos entram em fluxo interno. O texto bruto e o contato privado nao aparecem em paginas publicas.
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  name: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black uppercase">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-12 w-full border-2 border-comun-black bg-white px-3"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  required,
  minLength,
  rows = 8,
  placeholder,
  value,
  onChange,
}: {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  rows?: number;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black uppercase">{label}</span>
      <textarea
        name={name}
        required={required}
        minLength={minLength ?? (required ? 20 : undefined)}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="min-h-[12rem] w-full border-2 border-comun-black bg-white p-3"
      />
    </label>
  );
}

function Check({
  name,
  label,
  helper,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  helper: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-16 items-start gap-3 border-2 border-comun-black bg-white p-3 font-bold">
      <input
        type="checkbox"
        name={name}
        value="true"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-6 w-6"
      />
      <span>
        <span className="block">{label}</span>
        <span className="mt-1 block text-sm font-medium text-comun-asphalt/70">{helper}</span>
      </span>
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-comun-black bg-white p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/70">{label}</p>
      <p className="comun-prose mt-2 whitespace-pre-wrap text-sm font-medium">{value}</p>
    </div>
  );
}

function getCategoryLabel(value: string) {
  return categoryLabels[value as keyof typeof categoryLabels] ?? value;
}
