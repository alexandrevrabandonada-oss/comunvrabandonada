import type {
  CurationActionCode,
  CurationBlockerCode,
} from "./cultural-curation-readiness";

export type CulturalCurationCopy = {
  title: string;
  explanation: string;
  nextAction: string;
};

const blockerCopy: Record<CurationBlockerCode, CulturalCurationCopy> = {
  missing_specialization: copy("O caminho cultural ainda precisa ser escolhido", "Defina qual equipe especializada deve continuar este trabalho.", "Escolher o caminho da contribuição"),
  incomplete_handoff: copy("O encaminhamento ainda não foi concluído", "A contribuição precisa chegar ao fluxo especializado antes da curadoria.", "Concluir o encaminhamento"),
  material_incomplete: copy("Faltam informações sobre o material", "Complete título e contexto para que a equipe compreenda a contribuição.", "Completar as informações do material"),
  provenance_incomplete: copy("A origem ainda precisa ser registrada", "Informe de onde veio o material e qual é a relação da pessoa com ele.", "Registrar a origem e o contexto"),
  rights_review_required: copy("Direitos ainda precisam ser conferidos", "A equipe precisa revisar autoria, autorização e condições de uso.", "Conferir os direitos"),
  review_only: copy("Uso restrito à revisão interna", "O material pode ser estudado, mas ainda não tem autorização para uso editorial.", "Revisar a autorização de uso"),
  authorship_unconfirmed: copy("A autoria ainda não foi confirmada", "Não presumimos que quem enviou seja autor ou titular da obra.", "Confirmar autoria e vínculo com a obra"),
  license_required: copy("A licença precisa ser registrada", "O tipo de reutilização escolhido exige uma licença explícita.", "Registrar a licença aplicável"),
  safety_review_required: copy("É necessária uma revisão de cuidado", "Há aspectos de segurança ou exposição que precisam de avaliação editorial.", "Concluir a revisão de cuidado"),
  asset_not_ready: copy("O arquivo original ainda precisa ser preparado", "Confirme o original privado antes de avançar o trabalho editorial.", "Preparar e conferir o arquivo original"),
  derivative_not_ready: copy("As versões de trabalho ainda não estão prontas", "As derivadas necessárias precisam ser processadas e conferidas.", "Preparar as versões de trabalho"),
  oral_history_recording_consent_missing: copy("Falta consentimento para gravação", "A conversa inicial não autoriza automaticamente uma entrevista gravada.", "Registrar o consentimento para gravação"),
  oral_history_voice_consent_missing: copy("Falta autorização para uso da voz", "A voz exige autorização própria no fluxo de História Oral.", "Registrar a autorização de voz"),
  oral_history_transcription_consent_missing: copy("Faltam acordos sobre transcrição e edição", "Transcrever e editar são etapas consentidas separadamente.", "Registrar os consentimentos de transcrição e edição"),
  oral_history_publication_consent_missing: copy("Falta consentimento para exibição pública", "Gravar ou transcrever não autoriza publicação.", "Revisar o consentimento de exibição"),
  oral_history_withdrawal_pending: copy("Há um pedido de retirada pendente", "O pedido deve ser resolvido antes de qualquer avanço editorial.", "Resolver o pedido de retirada"),
  radio_voice_consent_missing: copy("A voz ainda precisa de autorização", "A contribuição de Rádio exige conferência específica do uso da voz.", "Conferir a autorização de voz"),
  music_rights_incomplete: copy("Os direitos musicais estão incompletos", "Música de terceiros exige verificação própria antes de avançar.", "Encaminhar para a revisão de Música"),
  private_root_source_ineligible: copy("A contribuição ainda não pode virar rascunho", "Faltam condições mínimas ou o estado atual impede a criação da raiz privada.", "Revisar a contribuição especializada"),
  private_root_editorial_decision_required: copy("Pronto para uma decisão editorial", "A criação do rascunho privado depende de uma decisão explícita da equipe.", "Abrir e decidir"),
  radio_private_root_destination_required: copy("Escolha onde este áudio entra na Rádio", "Defina o destino editorial antes de criar qualquer rascunho privado.", "Escolher programa ou episódio"),
  radio_existing_target_reconciliation_required: copy("Escolha o destino editorial na Rádio", "Esta contribuição deve ser vinculada ou encaminhada no fluxo existente.", "Abrir e escolher o destino"),
  artwork_existing_target_reconciliation_required: copy("Escolha a obra existente relacionada", "Complementos e correções não devem criar uma obra duplicada.", "Vincular à obra correta"),
  music_pipeline_required: copy("Encaminhar para Música", "Esta contribuição segue o fluxo especializado de Música, não um upload genérico de Rádio.", "Abrir o fluxo de Música"),
};

const actionCopy: Record<CurationActionCode, string> = {
  complete_handoff: "Concluir o encaminhamento",
  add_material_context: "Completar as informações do material",
  record_provenance: "Registrar origem e contexto",
  resolve_rights: "Conferir direitos e autorizações",
  confirm_authorship: "Confirmar autoria",
  record_license: "Registrar a licença",
  complete_safety_review: "Concluir a revisão de cuidado",
  confirm_private_original: "Preparar o arquivo original",
  process_derivatives: "Preparar as versões de trabalho",
  record_oral_history_consents: "Registrar os consentimentos de História Oral",
  resolve_oral_history_withdrawal: "Resolver o pedido de retirada",
  record_radio_voice_consent: "Conferir a autorização de voz",
  resolve_music_rights: "Encaminhar para a revisão de Música",
  choose_radio_private_root_destination: "Escolher o destino na Rádio",
  reconcile_radio_existing_target: "Vincular ao destino correto na Rádio",
  reconcile_artwork_existing_target: "Vincular à obra existente",
  request_editorial_review: "Abrir para revisão editorial",
};

function copy(title: string, explanation: string, nextAction: string): CulturalCurationCopy {
  return { title, explanation, nextAction };
}

export function humanizeCurationBlocker(code: CurationBlockerCode | string): CulturalCurationCopy {
  return blockerCopy[code as CurationBlockerCode] ?? copy(
    "Esta contribuição precisa de atenção",
    "Abra a contribuição para conferir a pendência com segurança.",
    "Abrir e revisar",
  );
}

export function humanizeCurationAction(code: CurationActionCode | string): string {
  return actionCopy[code as CurationActionCode] ?? "Abrir e revisar";
}

export const knownCurationBlockerCodes = Object.keys(blockerCopy);
