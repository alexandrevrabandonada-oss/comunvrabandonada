# Escola R0 — fechamento controlado e certificação de #523

Base desta revisão: main `636e3e1dcc563aef0093d0a62aa80437b05a81a0`,
PR #532 integrado. Nenhuma funcionalidade, migration, manifest, flag ou regra
de indexação muda nesta revisão. O pacote permanece `remotePromotionAllowed=false`.

## Evidência auditada de #532 — PASS

Run [37857694282](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/37857694282).
Fonte CI `c583279d98906d29239c60280ef1ac737dc92a77`, tree
`4361a4578a305a51cc24fe053258b3d0802c28c9`, idêntica ao head revisado
`b51674e12440d0de78090420f98296a4f6bd5b84` e ao merge em main.
Capture artifact `11585170602`, SHA-256
`959d12c7ad846de3c6e26573188e9a075e337d7ad2a5b3cbc9208fafc3642085`;
proof artifact `11584732867`, SHA-256
`973596dc8c0dad60b0cf1633a94cc0b0be452ddc2ea7803523503e2619294e2e`.

O destino é validado por hostname/usuário/ref contra a allowlist do secret do
projeto; o envelope expõe somente hash da ref. PostgreSQL 17.6, database e
leitor `postgres`, default read-only na conexão, transação REPEATABLE READ READ
ONLY, confirmação `transaction_read_only=on` e ROLLBACK obrigatório. Catálogos,
history e ledger técnico são consultados; nenhuma linha de negócio. A identidade
allowlisted depende da configuração do secret existente, não prova acesso de
Management API nem capacidade de backup do provedor.

Os cinco ledgers Hardening/R1–R2/R3/R4/R5 são PRESENT_ACCEPTED. Escola ausente
em tabelas, funções, history e ledger direto; zero findings. Os quatro controles
48.2-A estão presentes. As duas omissões históricas permanecem visíveis no
artifact e só são classificadas sob os fingerprints R5 exatos e cinco ledgers
aceitos; a pendência acionável é somente `20261006134804`. Nenhuma expectativa
foi atualizada para passar.

O catálogo privado é vinculado separadamente: relações, colunas, constraints,
índices, policies, funções e triggers, sem suas linhas. Hashes de cada seção e
do catálogo, SHA/tree/run e hash da captura vinculam a prova descartável.
PRE público, ledger e catálogo privado precisam coincidir no laboratório;
leitor e search_path também. Auth/API/RLS não são inferidos desse inventário:
as provas reais separadas de #532 passaram nas runs 37857694340 e 37857694371.

## Pacote imutável

Migration `supabase/migrations/20261006134804_comun_learning_r0.sql`:
`5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7`.
Manifest `supabase/releases/20261006134804-comun-learning-r0.json`:
`3b598bc6b3ea3dfe462ba205b6747016aace52de87c87dec332ecbb1a567d4de`.
Contrato derivado, sem alterar manifest:
`reports/current/comun-escola-production-like-derived.json`.

| Estado | Canônico                                                           | Runner                                                             |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| PRE    | `160face699d0b22b88b0434a6393cedf587ce0ccf1f8338dd8765ec56f6fab4a` | `ccb89095e56cad37b6b0e8459eee4eee9c130abd709b78940a85578a302c317f` |
| POST   | `d32721d3fb6df9203ff8aa6af00cddab64cf9bb948e47e9e4f799f328b0625ad` | `1e78dfc1986015c57615f24766caf099df9459d33644971d3b1a08f53e45af66` |

## Correção focal do executor — PASS no candidato funcional

Finding demonstrado por revisão do fluxo: #532 derivava POST e verificava
estrutura/isolamento, mas não exigia o par POST aprovado antes do COMMIT.
Agora o caminho Production-like usa o contrato derivado já revisado para PRE
e POST. Nenhum fingerprint é recalculado como expectativa nesta run.
Antes do COMMIT, verifica novamente schema e ledger completo: os registros
anteriores mais exatamente uma row da Escola. Uma coluna sintética divergente
e um ledger sintético adulterado devem ambos abortar e preservar PRE.
As falhas após schema/history/ledger e a recusa de replay continuam obrigatórias.

A nova captura acrescenta somente SELECTs `pg_roles`/`has_*_privilege` para
CREATE no schema public, REFERENCES em auth.users e INSERT no history/ledger.
O laboratório compara essas capacidades com a captura e exige restauração
após cada rollback e COMMIT. A janela de privilégios permanece somente local;
nenhum GRANT/REVOKE remoto ou novo comando de promoção foi introduzido.

PASS local: 64 testes Node, zero skips. PASS SQL real do funcional
`775f86e9d82203d97ed6064842b817e2fa492589`, run
[37863202153](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/37863202153).
Fonte CI `05828f4e52f0054f0e86fafa406199d9885a8eac`, tree
`6a8bb4b138aa19e7445bb423af51bc6dfa03dc4d`, idêntica à do funcional.
Capture artifact 11587690204, SHA-256
`14a754e3916f71e28594d2c8929796b868ba3a4079bb75be48e0381ca79f86be`;
proof artifact 11586742840, SHA-256
`00b142c90c310ec8d492d42f04782996da23ff0832efc85fda7d0d737644f00b`.
Captura/ensaio ligados pelo hash; PRE/POST são exatamente os da tabela acima.
Controles SQL `postDriftRejectedAndPreRestored` e
`ledgerDriftRejectedAndPreRestored` verdadeiros, assim como
`approvedPostEnforcedBeforeCommit`, `ledgerVerifiedBeforeCommit` e
`executorPrivilegesRestored`. Aplicação única, três falhas pré-COMMIT e replay
recusado permaneceram verdes. Isso não é prova de backup do provedor.

A captura nova da run 37862599756 (artifact 11586895819) comprovou que o leitor
Production `postgres` já tem CREATE public, REFERENCES auth.users e INSERT
history/ledger, sem superuser. Nenhum privilégio foi concedido em Production.
O gate novo bloqueou corretamente `20c1d0ef`: a fixture histórica removia os
três primeiros direitos (`LEARNING_EXECUTOR_CAPABILITY_PRE_DRIFT`). A correção
reproduz esses direitos já existentes somente no banco sintético e conserva
o fingerprint esperado. O helper agora empresta/revoga apenas direitos ausentes,
preservando os preexistentes.

O segundo controle também bloqueou `f97a8f18` (run 37862857319): apenas uma
ACL extra CREATE para postgres divergira do catálogo aprovado. Artifact
11586956211 identifica exatamente `schemaGrants`, sem atualizar expectativa.
A captura seguinte confirmou diretamente database owner `postgres` e public
schema owner `pg_database_owner`: o direito efetivo vem dessa propriedade.
A fixture agora usa esse owner, sem adicionar a ACL pública divergente.
REFERENCES/INSERT são reproduzidos somente localmente; capacidades/owners e
catálogo inteiro precisam continuar iguais à captura. A prova 37863202153
passou esse contrato. As tentativas anteriores continuam FAIL no histórico;
Security do candidato obsoleto foi cancelado, nunca contado como PASS.

Este checkpoint atualiza apenas documentação/evidências sobre o funcional
775f86e9. Seus gates remotos próprios continuam necessários antes de merge.

## Procedimento exato e condições de interrupção

Reprodução autorizada: workflow `comun-learning-production-pre.yml` no PR,
sem dispatch; job A captura read-only e job B recebe somente o artifact
sanitizado, sem secrets Production. Job B executa
`bash scripts/learning/production-like-fixture.sh` em imagem pinada por digest.

Uma futura operação Production permanece BLOCKED e não tem CLI liberada:

1. Designar executor/revisor de release e operador de recuperação; comprovar
   acesso existente e capacidades, sem conceder privilégios por este pacote.
2. Comprovar backup real, ponto recuperável anterior à janela, cobertura e
   restauração isolada. Revisar dados sensíveis e efeitos externos do destino
   restaurado antes de criar uma cópia de Production.
3. Obter autorização específica para a única migration e history/ledger
   atômicos. Flags, indexação e business writes não fazem parte dela.
4. Revalidar hashes, destino allowlisted, versão/leitor/search_path, PRE,
   cinco ledgers, ausência da Escola e zero findings em captura nova.
5. O executor revisado deverá abrir SERIALIZABLE, adquirir
   `pg_advisory_xact_lock(20261006,134804)`, repetir PRE dentro da transação,
   aplicar somente o corpo dos bytes pinados, registrar history uma vez,
   exigir POST canônico/runner exatos, inserir somente o ledger desta release,
   revalidar ledger/schema/isolamento e então COMMIT. Não usar db push global.
6. Recaptura independente read-only deve provar POST e ledger aceito, seguida
   de smokes públicos não mutáveis. Manter a flag inalterada.

Hash/destino/PRE/POST/ledger/catálogo divergente, privilégio insuficiente,
finding inesperado, controle negativo ineficaz ou falha de recuperação:
interromper. Antes de COMMIT: ROLLBACK e comprovar PRE. Resposta perdida:
classificar read-only antes de qualquer retry; POST aceito recusa replay,
estado parcial/divergente bloqueia. Depois de COMMIT: manter flag desligada,
preservar dados, interromper; nunca DROP/reaplicar/restaurar Production de
forma automática. Este procedimento não autoriza sua execução remota.

## Recuperação do provedor — BLOCKED / NOT_RUN

Inspeção atual: `supabase_list_projects` não inclui COMUN; apenas dois projetos
alheios, que não foram consultados. Dashboard do Supabase redirecionou para
sign-in; nenhuma sessão autenticada de COMUN estava disponível. Não foram
alterados credenciais, permissões, billing, backup ou configurações.

BLOCKED: identificar plano/backup físico/PITR efetivamente habilitado em COMUN,
retenção, último ponto íntegro, RPO/RTO observado e acesso do executor ao restore.
NOT_RUN: restore real do provedor em destino isolado. Nenhum backup Production
foi exportado/copied e nenhum dado de usuário foi lido para suprir essa lacuna.

A [documentação de backups](https://supabase.com/docs/guides/platform/backups)
explica que backup do banco não contém os arquivos do Storage. O
[restore para novo projeto](https://supabase.com/docs/guides/platform/clone-project)
é uma cópia do banco, incluindo Auth/dados privados, e exige revisão de
configurações e operações externas; não equivale a branch vazia nem à fixture
sintética. Documentação geral não comprova disponibilidade no projeto COMUN.

Requisito externo mínimo: acesso autenticado de leitura ao backup do projeto
correto, evidência de ponto recuperável/cobertura e operador habilitado;
destino isolado com acesso restrito, decisão explícita sobre custo/cópia de
dados reais e ensaio de restore. Não solicitar ou publicar senhas/tokens.

## Responsabilidades e estado do candidato

Automação: GitHub Actions executa captura e provas descartáveis vinculadas ao
SHA. Preparação técnica: esta revisão de código/evidências. Responsável humano
pelo executor Production, operador de recuperação e revisor da release:
**não designados nesta rodada (BLOCKED)**; não inferir nomes ou aprovação.
Autorização recebida cobre preparação/testes e merges independentes com gates
verdes; não cobre migration Production.

Capacidades de catálogo do leitor: PASS na captura atual. Aplicação remota e
teste do executor em Production: NOT_RUN, conforme limite desta rodada.
O único executor de escrita liberado por este código continua descartável;
o manifest permanece fechado, e a preparação não autoriza contorná-lo.

#523 permanece draft no SHA `cf0e8e41a084e073a728cca269a0dbc38683bfe1`.
Quality 37856326546 attempt 1: pr-lane/a11y/network/P1T PASS; Território local
502 antes dos testes. Uma única reexecução dirigida foi iniciada, job
113600054616, attempt 2, sem alteração de código. PASS com marcador
`COMUN_TERRITORY_PROFILE_LOCAL_ONLY_GREEN`, artifact 11586945944. Quality
completo SUCCESS; inventário cf0: 45 SUCCESS, 88 SKIPPED, seis FAILURE, sem
pending. O 502 original é flake transitório de infraestrutura, não regressão
do candidato. Não foi adicionado retry ao produto ou ao helper.
Seis preflights Escola continuam FAILURE, não dispensados. Preview exato e
COST-02 anteriores permanecem válidos somente para cf0. Merge de #523 exige
resolver schema sob autorização separada, reconciliar main e validar o SHA
final. V1 e operação pública não estão certificadas.
