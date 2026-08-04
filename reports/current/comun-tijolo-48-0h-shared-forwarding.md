# COMUN Tijolo 48.0H — encaminhamento compartilhado

Estado da candidata: `COMUN_FORWARDING_48_0H_LOCAL_CANDIDATE_GREEN`.

- Migration: `supabase/migrations/20260804151244_comun_forwarding_local.sql`.
- SHA-256: `68235715785a01c6f7c94e65ad5a4342493ec39a0012923c356ccdc597475454`.
- Manifesto: `20260804151244-comun-forwarding-local.json`; `requiresPromotion=false`; `remotePromotionAllowed=false`.
- Pacote privado: requisitos de referência/local, contato privado e confirmação da mensagem; texto institucional derivado server-side, sem publicação.
- Estados: `missing_information`, `ready_for_review`, `ready_for_assisted_opening`, `opened_by_person`, `person_declared_sent`, `official_protocol_recorded`, `response_recorded`, `withdrawn`.
- Ações perigosas são separadas: revisar, abrir site oficial, declarar resultado, registrar protocolo informado pela pessoa, registrar resposta, retirar.
- Protocolo oficial é declarado pela pessoa, mascarado na rotina e imutável no primeiro registro; alteração silenciosa é rejeitada.
- Retirada inativa pacote e contato, preservando eventos append-only; sem delete automático.
- Adapter único: `vr-fiscaliza-lighting-v1`; categoria canônica `public_lighting`; sem automação.

O pacote nunca chama Fiscaliza VR. A abertura usa URL oficial somente depois do clique explícito; a pessoa envia no canal por sua própria ação.
