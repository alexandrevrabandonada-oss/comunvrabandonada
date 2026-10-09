# Escola — transação controlada em laboratório, 2026-10-09

Estado: `CONTROLLED_TRANSACTION_REHEARSAL_PROVED_PRODUCTION_EXECUTION_BLOCKED`.

## Correção independente integrada

PR #536 integrado por merge normal `eb2cb0156adf223d608e222677cccc00bf84e071`, a partir do head `ce0566d9f68d11899e8d0b341efbc541329bb349`: 42 checks SUCCESS, 82 SKIPPED, zero failure/pending. SKIPPED não é PASS.

Deployment Git Production `dpl_A8mi7en4dYdmzraShFN1xw1ehh7Z` READY, aliasError ausente; GitHub deployment `6967752965` success no merge SHA. GET `/api/comun/quality-status` confirmou esse SHA servido. GET das quatro rotas `/comun`, `/comun/denuncias`, `/comun/relatar`, `/comun/minha-participacao`: 200; www: 308 para apex.

Quality pós-merge `37971320870`, job `113958481898`, SUCCESS: `COMUN_QUALITY_REMOTE_READ_ONLY_GREEN`. Civic Graph `37971320748` e Core `37971321014` SUCCESS. Experience `37971320799` ainda em execução na captura deste relatório; certificação pós-merge completa permanece pendente. O sucesso atual não apaga logs dos failures anteriores.

## Prova nova, sem credencial Production

`scripts/learning/controlled-transaction.mjs` implementa uma transação de ensaio com identidade postgres não-superuser, privilégios preexistentes obrigatórios, fingerprints PRE/POST fixos, catálogo privado íntegro e verificação do ledger antes do COMMIT. Não empresta grants, não altera o manifest e não possui CLI Production. O guard original continua inalterado; o novo laboratório usa somente loopback na porta fixa 55443 e banco vinculado ao run label.

Teste real local em `c4f4facafa1674352bd5b93d5c660b3bd4f45b3c`, tree `afb231d3a83fa351fcdba386938b65f4dd817602`, PostgreSQL 17.6, imagem pinned `docker.io/supabase/postgres@sha256:8002645276dc3431d55a5049721a879e4d11c34177086dc0f13b61d98cff1e52`.

Captura read-only de referência: run `37962260855`, SHA256 `476c715e9500aeb7e166e1926602c873eaff164568dff2cb255d2858ff0a4a51`. A execução nova ocorreu no PC, não nessa run GitHub. Artifact local `controlled-rehearsal-c4f4faca-proof.json`, SHA256 `5c9a70d67f923eacd553a1e27053798cf015385b3cd40cb5bd3312a41875621a`.

| Caso                                                                                                              | Resultado                                                |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| PRE e POST exatos, zero findings                                                                                  | PASS                                                     |
| Falhas após schema, history e ledger: rollback para PRE                                                           | PASS                                                     |
| POST público divergente: rollback                                                                                 | PASS                                                     |
| Ledger divergente: rollback                                                                                       | PASS                                                     |
| Catálogo privado divergente: recusa antes do COMMIT e restauração                                                 | PASS                                                     |
| Aplicação única e replay recusado sem reaplicar                                                                   | PASS                                                     |
| COMMIT concluído com resposta perdida: resultado UNKNOWN, sem retry automático; recaptura read-only comprova POST | PASS                                                     |
| Privilégios e catálogo privado preservados                                                                        | PASS                                                     |
| Novo job remoto controlled-disposable                                                                             | NOT_RUN até conclusão da run do novo candidato           |
| Executor/destino Production separado                                                                              | BLOCKED; não implementado como caminho remoto de escrita |
| Migration Production                                                                                              | NOT_RUN                                                  |

O laboratório criou somente o seed editorial pinado: 28 unidades e 4 recursos; zero enrollments, progress e practice links. O container dessa execução foi removido pelo guard de ownership, sem limpar outros laboratórios ou as cópias de recuperação.

Dois problemas de preparação foram preservados: tentativa inicial recusada porque 55432 pertence a outro laboratório; segunda tentativa sofreu alteração do arquivo shell enquanto estava aberto. Após fixar uma porta independente e estabilizar/commitar os arquivos, o ensaio completo passou. Esses logs não demonstram defeito da migration.

O novo job `controlled-disposable` recebe apenas a captura sanitizada da mesma run, sem secrets Production, e repete a prova com SHA/tree registrados. Não substitui a prova do executor original nem uma restauração real completa.

## Limites e interrupção

Migration SHA256 `5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7`; manifest SHA256 `3b598bc6b3ea3dfe462ba205b6747016aace52de87c87dec332ecbb1a567d4de`: inalterados. `remotePromotionAllowed=false` permanece. Nenhum fingerprint foi recalculado para acomodar drift.

A autorização de migration foi recebida, mas acesso PostgreSQL protegido continua bloqueado: a cópia anterior está em D: indisponível, e não foi encontrada outra credencial preservada. É necessário recuperar esse arquivo protegido, sem enviar senha no chat. Antes de schema write, renovar o backup dos dados de negócio e testar sua recuperação; a igualdade de schema não prova que o dump de 02:39:42 UTC contém alterações posteriores.

Auth/Storage APIs completas na nova cópia, configurações externas e recuperação durável integral continuam NOT_RUN/BLOCKED conforme o pacote privado E:. Custódia independente da chave e mapping dos 2582 objetos Storage são subcontratos provados, não certificação integral.

Uma resposta perdida do COMMIT exige parar e recapturar read-only; nunca reaplicar automaticamente. Qualquer mudança em destino, privilégios, pacote, PRE, POST, catálogo privado ou ledger bloqueia. Nenhuma schema/business write Production foi executada por este ensaio. #523 permanece separado/draft com seus seis preflights, sem bypass. Flags e indexação intactas. Escola não liberada; V1 não concluída.
