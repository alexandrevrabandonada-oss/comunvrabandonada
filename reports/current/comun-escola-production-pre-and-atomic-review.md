# Escola R0 — PRE atual e equivalência descartável

## Escopo de 08/10/2026

PR #532, base main `4bf839d61a6eb77965c1efa0a4ebbbe307cfdd21`.
Nenhuma migration, manifest, flag ou permissão Production foi alterada.
O instalador continua exclusivamente descartável e o pacote mantém
`remotePromotionAllowed=false`.

Captura real [37855395017](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/37855395017),
artefato 11583906100, source SHA `32529e0788217f461739a9ba90db8291f28174ff`,
tree `1c0700e6d44c60dffc00e1c1a87798f4ad15334d`:
o campo tree autoritativo é o registrado no JSON preservado, não uma inferência
a partir do nome do artifact. SHA-256 do JSON:
`80d8aa4dcd9c885687698fc6027f74f9cd218affe8512535aded001844e3613e`.

PASS nessa captura: destino allowlisted, PostgreSQL 17.6, transação read-only,
ROLLBACK confirmado, nenhum dado de negócio consultado, cinco ledgers aceitos,
zero canonical findings, Escola e seu ledger ausentes. Canonical PRE
`160face699d0b22b88b0434a6393cedf587ce0ccf1f8338dd8765ec56f6fab4a` e runner PRE
`ccb89095e56cad37b6b0e8459eee4eee9c130abd709b78940a85578a302c317f`
coincidem com o POST aceito do R5, sem modificar expectativas.

Os controles 48.2-A consultados (projeção P4, RLS, geometria pública e histórico
P6C-C) estão presentes. Nenhuma migration remota é desconhecida. Escola é a
única pendência acionável. As duas omissões históricas `20260724233256` e
`20260922120000` permanecem visíveis no artifact e seguem a reconciliação
canônica já existente, condicionada ao fingerprint exato e aos ledgers aceitos.
Isso não torna o plano remoto vazio nem libera os seis preflights do #523.

## Captura e prova separadas

O job read-only é o único com credenciais Production, restritas ao passo de
captura. Conexão com default read-only, transação REPEATABLE READ READ ONLY,
SELECTs de catálogos/histórico/ledger e ROLLBACK. Nenhum lint instala extensão.
O catálogo privado registra relações, colunas, constraints, índices, policies,
funções e triggers de entidades; não contém suas linhas de negócio.

O segundo job recebe somente o artifact da mesma run. Exige SHA/run, hashes
das seções, identidade do leitor postgres, versão PostgreSQL, dois fingerprints,
ledger completo e catálogo privado iguais antes da aplicação. A imagem
Supabase PostgreSQL está pinada por digest no script.

A fixture histórica é reconstruída com R1–R5 aceitos. Linhas técnicas ausentes
do ledger são restauradas da captura sanitizada; nenhuma linha existente é
sobrescrita. A instalação da Escola ocorre como postgres. Direitos temporários
de execução existem apenas dentro da transação descartável e são revogados
antes de calcular POST. Falhas após schema, history e ledger precisam preservar
PRE. Aplicação única, POST, ledger e recusa de replay são gates independentes.
O catálogo privado deve permanecer idêntico após cada rollback e após POST.

O ensaio original de schema local completo continua distinto. Auth/API/RLS com
usuários sintéticos continuam no workflow canônico da Escola; inventário de
policies não substitui essa prova funcional. Resultado do novo ensaio real deve
ser consultado no PR #532; não é presumido pelos testes Node.

## Pacote imutável e autorização ainda necessária

Migration: `20261006134804_comun_learning_r0.sql`, SHA-256
`5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7`.
Manifest: `20261006134804-comun-learning-r0.json`, SHA-256
`3b598bc6b3ea3dfe462ba205b6747016aace52de87c87dec332ecbb1a567d4de`.
POST derivado é emitido no artifact separado; não altera o manifest bloqueado.

Antes de qualquer escrita Production ainda faltam: prova equivalente verde no
candidato final, revisão do POST derivado e de um executor Production apropriado,
capacidade de recuperação do provedor demonstrada e autorização específica para
aplicar somente esta migration com history/ledger atômicos. Nenhuma concessão
temporária do laboratório autoriza mudar permissões Production.

Recuperação antes de COMMIT é ensaiada por rollback. Recuperação pós-COMMIT não
é DROP automático nem prova de backup: preservar dados, manter flag desligada e
interromper a operação. Não se inventam responsáveis ou aprovação editorial.

58 testes Node focais passaram localmente. Prova real do novo head: consultar
a run correspondente; SKIPPED, CANCELLED e PENDING não são PASS.
