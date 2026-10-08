# Escola R0 — PRE atual e equivalência descartável

## Resultado real do candidato funcional

`COMUN_LEARNING_PRODUCTION_LIKE_ATOMIC_DISPOSABLE_GREEN`, run
[37857277943](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/37857277943),
candidato `05c6216d4f97983649dd11a2f4665ca34942974f`.
O CI executou merge sintético `c2d17db232ab8833cd3a618c0215271ee0e11bd0`;
sua tree `9754dd5fe11768cadf9e051b961b8f53e60b10aa` é idêntica à do candidato,
conferida por `git rev-parse` nos dois objetos.

Captura final 11584502750, JSON SHA-256
`4e248ba07d6c739a0d53dc322479ea6c7aabc5d9e08b27d581932117077ce97b`.
Prova 11585006121, JSON SHA-256
`b95e2ca460f70ff92484f18c44afb384a1920b6dbcea0de8f9877c64412cdccd`.
Os PRE fingerprints permaneceram iguais aos registrados abaixo; ledgers
aceitos, ausência da Escola, zero findings e catálogo privado estável.

PASS real: equivalência PRE, falhas após schema/history/ledger com PRE intacto,
aplicação única e registro atômico, POST, recusa de replay, catálogo privado
inalterado e zero findings. POST canônico derivado
`d32721d3fb6df9203ff8aa6af00cddab64cf9bb948e47e9e4f799f328b0625ad`;
runner `1e78dfc1986015c57615f24766caf099df9459d33644971d3b1a08f53e45af66`.
Seed real: 28 unidades, quatro recursos; enrollments/progress/practices zero.
O ensaio de schema local completo também passou na run 37857277963.
Auth/API/RLS da run 37857277950 é uma prova separada; consultar seu resultado,
sem converter pendência em PASS.

O fingerprint depende também do contexto de catálogo. Reader, session user e
search_path Production foram capturados; o laboratório reproduz reader e
search_path exatos. Concessões de execução ficam somente na transação local;
SET LOCAL ROLE preserva a identidade de leitura após COMMIT/ROLLBACK.

Pacote sanitizado: [comun-escola-production-like-derived.json](comun-escola-production-like-derived.json).
Ele referencia evidências e hashes; não é manifest executável nem autorização
de escrita. Production segue PRE, Escola/ledger ausentes, zero schema/business
writes nesta rodada. Backup do provedor e plano pós-COMMIT continuam bloqueios
separados, assim como a autorização explícita de futura promoção.

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
