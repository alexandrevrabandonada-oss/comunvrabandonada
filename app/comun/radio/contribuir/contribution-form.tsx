"use client";
import { useActionState } from "react";
import { submitRadioContribution } from "../actions";

const control = "block w-full border-2 bg-white p-3 text-comun-black";

export function RadioContributionForm({ progressiveRightsEnabled = false }: { progressiveRightsEnabled?: boolean }) {
  const [state, action, pending] = useActionState(submitRadioContribution, null);
  return <form action={action} className="mt-7 grid max-w-2xl gap-4">
    <label>Tipo<select name="type" className={control}><option value="program_proposal">Proposta de programa</option><option value="pauta_proposal">Proposta de pauta</option><option value="community_audio">Áudio comunitário</option><option value="authorized_testimony">Depoimento autorizado</option><option value="own_music">Música própria</option><option value="agenda">Agenda</option><option value="correction">Correção</option><option value="withdrawal">Retirada</option></select></label>
    <label>Título<input name="title" required className={control}/></label>
    <label>Contexto<textarea name="context" required minLength={20} className={`${control} min-h-40`}/></label>
    <label>Crédito sugerido<input name="credit" className={control}/></label>
    <label>Contato privado opcional<input name="contact" className={control}/></label>
    {progressiveRightsEnabled ? <>
      <fieldset className="grid gap-2 border-2 p-3"><legend className="font-black">Voz</legend><label>De quem é a voz?<select required name="voiceSource" defaultValue="" className={control}><option value="" disabled>Escolha uma opção</option><option value="no_voice">Não há voz gravada nesta proposta</option><option value="submitter_voice">Minha voz</option><option value="third_party_voice">Voz de outra pessoa, com autorização a confirmar</option><option value="unknown">Ainda não sei</option></select></label></fieldset>
      <fieldset className="grid gap-2 border-2 p-3"><legend className="font-black">Texto e material</legend><label>Origem do material<select required name="materialSource" defaultValue="" className={control}><option value="" disabled>Escolha uma opção</option><option value="original_text">Texto/ideia própria</option><option value="authorized_third_party">Material de terceiro autorizado</option><option value="third_party_unverified">Material de terceiro ainda não confirmado</option><option value="unknown">Ainda não sei</option></select></label><p className="text-sm">Música incorporada possui análise própria; esta declaração não concede licença musical.</p></fieldset>
      <label>Escopo nesta etapa<select required name="publicationScope" defaultValue="review_only" className={control}><option value="review_only">Somente avaliação privada</option><option value="comun_audio">Áudio no COMUN, após revisão</option><option value="comun_audio_and_reuse">Áudio e reutilização sob licença informada</option></select></label>
      <label>Reutilização<select required name="reusePermission" defaultValue="not_defined" className={control}><option value="not_defined">Ainda não definida</option><option value="comun_only">Somente usos definidos pelo COMUN</option><option value="licensed_reuse">Permitida sob a licença informada</option></select></label>
      <label>Licença, se houver<select name="licenseCode" defaultValue="not_defined" className={control}><option value="not_defined">Não definida</option><option value="none">Sem licença de reutilização</option><option value="cc_by_4_0">CC BY 4.0</option><option value="cc_by_sa_4_0">CC BY-SA 4.0</option><option value="external_license">Licença externa; será conferida</option></select></label>
      <label>Identidade pública<select required name="identityPreference" defaultValue="" className={control}><option value="" disabled>Escolha uma opção</option><option value="anonymous">Anônimo</option><option value="public_credit">Crédito público</option><option value="artistic_name">Nome artístico</option><option value="collective">Coletivo</option></select></label>
    </> : <label><input type="checkbox" name="consent" required/> Tenho autorização adequada e informei os direitos conhecidos.</label>}
    <label><input type="checkbox" name="moderation" required/> Compreendo que o envio será privado e moderado.</label>
    <button disabled={pending} className="bg-comun-yellow p-3 font-black uppercase text-comun-black">{pending ? "Enviando…" : "Enviar para triagem"}</button>
    <p role="status">{state?.error || state?.protocol}</p>
  </form>;
}
