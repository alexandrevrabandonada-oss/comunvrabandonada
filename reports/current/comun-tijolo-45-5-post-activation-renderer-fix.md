# Tijolo 45.5 — correção do renderer pós-ativação

Resultado: `COMUN_SIDEWALK_POST_ACTIVATION_RENDERER_CORRECTED_RUNTIME_UNCHANGED`

Fix ID: `sidewalk-post-activation-renderer-fix-20260729-05`

## Causa-raiz

O renderer legado em `scripts/solo/render-sidewalk-operational-gate-report.mjs`
foi criado para o diagnóstico pré-ativação do attempt 02. Ele fixava
`consumedRun`, `consumedAttempt`, `flag`, `publicState` e `attempt03`, sem
contrato de fonte pós-ativação. Por isso, o pacote legado podia ser combinado
indevidamente com o payload runtime posterior e verde.

O artifact histórico do attempt 02 não foi apagado, reescrito nem
reclassificado. O renderer legado passa a se declarar como
`historical_pre_activation`; o novo renderer aceita somente artifacts do tipo
de resultado de ativação em `current_post_activation`.

## Contrato atual

O pacote atual exige uma única fonte compatível em todos os campos abaixo:

- activation run: `30454192828`
- activation attempt: `sidewalk-activate-20260729-03`
- activation SHA: `9b07bcfb52c4a3b9d00c5e0fa263237f3e8b110c`
- inventory run: `30455092900`
- protected diagnosis run: `30455096013`

Run, attempt, SHA, tipo, escopo, inventário, runtime e snapshot são validados
de forma cruzada. Ausência de fonte compatível produz evidência insuficiente;
mistura, duplicidade ou qualquer divergência interrompem a renderização sem
fallback para artifact histórico.

## Pacote renderizado

O pacote sanitizado em
`reports/current/comun-sidewalk-post-activation-renderer-evidence.json`
registra `READY`, banco `reachable`, ledger `exact`, flag `enabled`, runtime
`OPERATIONAL_READY`, estado público `active`, e zero escrita em banco ou
Storage. Ele também registra que esta correção não executou ativação,
migration ou rollback, não reutilizou o attempt 03 e não alterou ambiente ou
deployment.

## Integridade e limite

- migration SHA-256:
  `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`
- manifesto canônico SHA-256:
  `ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335`
- controle de consumo: `process_controlled_consistent`
- nonce remoto persistente: `false`

O checkpoint 45.4 permanece historicamente bloqueado; esta correção não o
declara verde retroativamente. O próximo gate permitido é repetir, em tijolo
separado e somente leitura, o checkpoint completo de estabilidade
pós-ativação com novo checkpoint ID. A primeira contribuição em produção
continua não autorizada.
