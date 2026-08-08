# COMUN 48.1B-P3B — cleanup

Status: cleanup autorizado, mas pós-voo não comprovado; localização permanece desligada.

Identificação read-only (workflow `31231647886`):

- resultado: `COMUN_P3B_ORPHAN_FIXTURE_IDENTIFIED_EXACTLY_ONE`;
- categoria: `sidewalk_accessibility`;
- minuto sanitizado: `2026-08-08T00:28Z`;
- `candidateCount=1`, `activeLocationCount=1`;
- texto: somente SHA-256 e comprimento (`68`), nunca o conteúdo;
- carteira: um item, nenhum vínculo de conta;
- anexos: zero;
- snapshot público, coletivo e forwarding: zero;
- fingerprint: `8ca45163ecef27c671f68313673d567f512e5a95e8945e16c0a72d6ba0bc7c06`.

Cleanup autorizado (workflow `31239000256`) falhou no pós-voo com
`operator does not exist: text = uuid`. O erro ocorreu na consulta de
verificação de carteira, que comparava `subject_ref` (texto) com `case_id`
(UUID). O log mostra que o comando `COMMIT` foi alcançado antes da consulta;
por isso não se afirma GREEN sem uma verificação read-only posterior. O
artifact sanitizado ficou vazio porque o pipeline com `tee` não propagava o
exit code; isso também foi corrigido no runner. Não houve retry automático.

O cleanup exige a autorização exata
`AUTORIZO_P3B_SYNTHETIC_CLEANUP_<fingerprint>` e reidentifica a fixture dentro
da própria transação antes de qualquer alteração.

O primeiro ensaio remoto foi criado com texto sintético de calçada e coordenada fixa. A execução foi interrompida antes da retirada por uma asserção de campo de resposta incorreta (`hasPrivateLocation` em vez do estado canônico `location`). A resposta não continha latitude nem longitude.

Tentativa de recuperação por deployment staged temporário foi encerrada sem escrita porque o cliente REST server-side não pôde ler o schema `private`; o endpoint temporário foi removido antes do deploy canônico. O MCP retornou `permission denied` para consulta read-only.

O cleanup deverá operar apenas por IDs exatos da fixture, retirar localização pela API antes de qualquer remoção de dados de teste e provar:

- nenhum objeto público;
- nenhum ciphertext ou coordenada em artifact;
- histórico de localização retirado preservado conforme retenção;
- zero carteira/relato sintético residual quando a política do ambiente permitir a remoção da fixture;
- nenhum dado legítimo alterado.

Não usar SQL manual em Production para apagar histórico append-only. Reabrir a ativação somente com uma capacidade server-side auditada que consiga localizar a fixture por escopo exato e retirar o relato/localização sem tocar em dados legítimos.

## C3 — cleanup

Os runs `31260049930`, `31260199454`, `31260510529` e `31260965396` foram
bloqueados antes da criação da fixture pelo gate de capacidade. O run final
`31261385771` também parou antes do smoke e executou rollback automático.
Consequentemente não houve fixture nova, não houve cleanup necessário e não há
resíduo sintético adicional. O cleanup órfão anterior continua comprovado pelo
run `31239240233`, com `hardDeletes=0` e `plaintextLocationRead=false`.

## Recovery concluído e smoke C2

O runner foi integrado na main pelos PRs #186 e #187. A verificação read-only do
run `31239240233` comprovou exatamente uma fixture retirada:

- `activeLocationCount=0`, `withdrawnLocationCount=1`;
- `withdrawnCaseCount=1`, `withdrawnReportCount=1`;
- `activeWalletItemCount=0`, `revokedWalletCount=1`;
- `activeRecoveryCredentialCount=0`, `activeAccountLinkCount=0`;
- `hardDeletes=0`, `plaintextLocationRead=false`.

A migration F1 foi promovida separadamente e validada no run `31243106898`.
No C2, a primeira fixture de smoke falhou antes de adicionar localização por
triagem incompleta; a recuperação retirou o relato sem criar localização. A
segunda tentativa usou texto classificável, mas a rota de localização retornou
`404`, indicando que a chave server-side não passou no gate de validade. O
rollback foi executado no run `31244127100`.

Nenhum UUID, texto integral, coordenada, segredo ou connection string foi
publicado. Não houve hard delete. A flag de localização permanece desligada.

Resultado: `COMUN_P3B_BLOCKED_LOCATION_RUNTIME_KEY_INVALID_OR_UNAVAILABLE`.
