# Production reconciliada — captura pendente (setembro de 2026)

Estado: `PRODUCTION_DRIFT_RECONCILIATION_REQUIRED`. Este documento não aprova uma nova release nem substitui o baseline canônico remoto.

## Duas referências distintas

- `CLEAN_BOOTSTRAP_BASELINE`: schema produzido pelas migrations do repositório em instalação nova. O Hardening v2 atual foi fingerprintado sobre esse estado (`expectedPreFingerprint=5e9bea5b30676f45d7049342a6ef1133b929e484fe841ae14a2fdbb2bd0cc5f9`). CI de bootstrap continua a verificá-lo.
- `PRODUCTION_RECONCILED_BASELINE`: estado real de Production após reconciliações forward-only históricas. A captura canônica de owners, grants, triggers, findings e fingerprint ainda não foi obtida nesta rodada. O fingerprint de promoção precisa representar este estado e continuar sujeito ao scanner completo.

Não se exige que esses baselines sejam estruturalmente iguais enquanto o legado remoto preservado for deliberadamente mantido. A diferença permitida precisa ser enumerada e auditada; ela não é uma exceção no fingerprint nem no scanner.

## Evidência disponível

O artifact `comun-pre-promotion-checkpoint-597bdc6809fa656ab698a9150d9b6025a9fdafe3` da run `35785337902` contém `schema.sql` sanitizado com SHA-256 `2602fc527082843c49e0029a96bf179276766f345224b0167367245a9b9397f2`. A aplicação do Hardening v2 parou com `SOLO_CANONICAL_PRE_FINGERPRINT_MISMATCH` antes da transação e do merge.

Uma restauração **local** desse dump em PostgreSQL 17.6.1.167 foi comparada com `.ci-artifacts/security-hardening-v2-before.json`. As relações remotas adicionais são exatamente `comments`, `communities`, `knowledge_pages`, `posts`, `profiles`, `project_links` e `reactions_as_actions`, as mesmas sete reconhecidas por `ALLOWED_REMOTE_LEGACY_TABLES` em `scripts/security/rehearse-comun-database-restore.mjs` e preservadas por `scripts/generate-pr23-reconciliation.mjs`. No replay, elas respondem por 69 colunas, 30 constraints, 25 índices, 20 policies, seis triggers e duas funções públicas associadas. Este é um inventário estrutural do dump; ele não prova permissões ou segurança dessas relações.

O dump foi gerado com `--no-owner --no-privileges`, então owners e grants da restauração não representam Production. Também não contém o resultado remoto da query `schemaFingerprintQuery`. Hashes de fingerprint calculados no replay **não** são `actualPre` remoto. O pre/post do manifesto permanece inalterado até existir uma captura read-only canônica que permita reconstrução fiel e prova de 74→0 no fixture.

## Consentimento separado

`CONSENT_SCHEMA_LEDGER_RECONCILIATION_PENDING`: `20260901000000_comun_relata_collective_entity_consent_foundation.sql` está ausente no ledger remoto capturado. A migration cria apenas objetos em `private`. Num clone local do checkpoint, sua aplicação deixou idêntico o resultado de `schemaFingerprintQuery`, provando que não explica o mismatch bloqueante. Ela não foi aplicada, reparada nem marcada como aplicada em Production e requer investigação e autorização próprias.

## Próxima prova necessária

Capturar `scripts/db/verify-canonical-baseline.mjs --capture` em Production por execução estritamente read-only e preservar o artifact antes dos projetores históricos. Comparar fingerprints, findings, owners, grants, triggers, migrações e hash de defaults gerenciados com o bootstrap e com este checkpoint. Se surgir uma oitava relação remota ou classe nova de finding, manter `PRODUCTION_DRIFT_RECONCILIATION_REQUIRED`. Não recalcular o manifesto apenas com o dump sem privilégios.
