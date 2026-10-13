# 49-E3 — orientação e continuidade privada da formação

Estado: candidato de integração; CI/Auth/Preview da nova tree PENDING.
Data: 2026-10-07. Não é autorização de merge, schema, flags ou lançamento.

## Entrega e origem

Une as entregas existentes #503 (7007d1765a153984bd0cd90b7c61fe5144455f5e) e
#520 (4e17fae75f6259f3b19d51f5beb80ad043206f7a), preservadas em seus PRs drafts.
Main/base consultada: 74cc0ed1779f5432496c3f852ce92bed3524a3a1.
Merge LOCAL: df8c59228c6e3c4bcbdc10e39e6825f2d6e9e386,
tree9b89f2d2438129c028564721b31ec5dba0c21973, pais acima.
Nenhum PR foi integrado em main ou automaticamente superseded.

A pessoa pode consultar orientação contextual, voltar aos registros privados e
retomar uma formação realmente iniciada. Minha participação mostra etapa/destino
own-only, distingue prática por registrar/revisão, vazio/erro e recuperação.
Carteira, progresso, prática, materiais e vínculo existente continuam autoridade.
Navegação não atribui tarefa, função, inscrição ou vínculo. Usar/Participar/Organizar
continuam independentes; pilot_noindex e flags de ativação são preservados.

## Sete conflitos resolvidos

- A1 mantém ownership canônico, paths e condição not_applicable de #503;
  incorpora a verificação completa do plano e read-only de #520.
- Planner conserva PGOPTIONS read-only nos subprocessos, hashes/fingerprints,
  ledger exato, recusa de saída vazia/não-zero/unknown e restauração de arquivos.
- Ensaio de workflows inclui a união de 14 lanes dos dois candidatos.
- Auditores conferem as 240 rotas efetivamente presentes: sete Escola + orientação.
- Solo registra explicitamente os dois workflows adicionais; unknown segue fechado.

Minha participação, shell e roadmap combinaram automaticamente. Nenhum diff da
resolução na API/core/runtime SQL/manifest da Escola ou na carteira/guidance de
#520. Migrations herdadas não foram editadas. Não transferir prova entre trees.

## Evidência local vinculada a df8c5922/tree9b89f2d2

PASS: unit oficial 1.427 testes/247 arquivos; Solo113; dez Node planner/coerência/
superfícies; TypeScript; ESLint focal; Prettier; git diff --check; build Next16.3.8.
Carteira→orientação→retorno: API interceptada com fixtures declaradas, onze casos
PASS na primeira execução; caso vazio desktop atingiu timeout e PASS em rerun
focal no mesmo código, sem ampliar timeout. Isso não é prova Auth/Postgres.

PASS: as 14 lanes reais do ensaio dos passos Bash rodaram em Ubuntu24.04/
Node22.18.0, importando o bundle, com SHA/tree conferidos. Usam substitutos
controlados para psql/Supabase/git, preservando exigência de transação read-only,
ledger e restauração; não contactaram Production.

Bundle incremental SHA-25653589181163aa73e00423e8054eef5a33c159b0400b4742e4476e298b8cab3d1,
verificado/importado fora do produtor; tree idêntica. Pré-requisitos:
74cc0ed1779f5432496c3f852ce92bed3524a3a1 e seu ancestral
9bd865efe5d6a30f4dedc7e0a10054e5f3c1985c.

## Executor descartável e bloqueio local

Docker Desktop29.2.1 inicialmente retornou pipe ausente, depois respondeu.
Portas55431/55432 ocupadas por stack preexistente: preservada. Criado Docker
aninhado exclusivo (sem socket host, nenhum secret Production), Docker29.6.2,
namespace separado, labels e daemon identity antes de qualquer escrita.
CLI Supabase2.117.0 conferida com checksum oficial; oito boundary/controller PASS.

Durante download/preparação o backend Desktop/WSL deixou de responder:
DockerDesktop/Wsl/ExecError e HTTP500 nas exec APIs. A prova Auth NÃO rodou.
Não inferir defeito da aplicação. Não resetar Desktop, encerrar WSL ou parar
stacks preexistentes. Limpeza dos dois containers próprios fica PENDING enquanto
API host estiver indisponível; identificados por label comun.proof.run=
202610072123-1 e nomes comun-proof-dind-df8c5922-20261007/
comun-proof-toolbox-df8c5922-20261007. Nenhum volume de usuário foi removido.

Alternativa autorizada: CI Linux existente em PR draft separado da união,
com checkpoint explícito. Exigir nova prova canonical-auth completa e checker
zero, artefato SHA/tree, Preview Git exato e inventário dos checks aplicáveis.
Prova #503 run37659112945 PASS para tree39c01174, não certifica a tree combinada.

## Pendências e limite

A atualização deste relatório não altera runtime. Evidências finais da nova run
serão registradas no corpo do PR e no pacote sanitizado, sem criar loop de commits
apenas para atualizar SHAs de documentação.

Não executar merge, schema write, ativação, lançamento ou qualquer DML Production.
Sem amostra humana não declarar facilidade percebida, qualidade pedagógica,
operação de núcleos, governança ou resultado real. Ensaio humano/editorial e
jornada privada completa sem JavaScript: NOT_RUN. Competências/Fábrica não
presumidas integradas. PR draft até gates e revisão; ativação é decisão separada.

## Finding remoto: registry do guard — 08/10/2026 UTC

Checkpoint8c99, run37708670513, canonical-auth job113089080522: falhou ANTES da
prova Auth por unexpected image lineage. CLI2.117.0 usou o fallback oficial
GHCR: ghcr.io/supabase/postgres:17.6.1.167, após retries ECR. School mínimo passou;
checker/proof artifact skipped, não PASS. A stack remota foi destruída no finally.

A [fonte oficial da CLI pinada](https://github.com/supabase/cli/blob/v2.117.0/apps/cli-go/internal/utils/docker.go)
resolve ECR e GHCR com o mesmo nome/tag. Correção focal somente no harness:
allowlist de quatro referências exatas, postgres17.6.1.167 e kong2.8.1, nos dois
registries oficiais. Não é afirmação de equivalência binária por digest. Não
aceitar outro namespace, versão, latest, sufixo ou imagem de serviço trocado.
O prefixo amplo ECR anterior foi substituído por referências exatas. Nome de
container, running, portas, run/project ID, loopback e recusa de secrets continuam
obrigatórios antes de cada write. Nove boundary/controller PASS, incluindo
fallback legítimo e controles negativos; Prettier/diff-check PASS.
Nenhuma mudança em API, Auth de produto, SQL, grants, RLS, manifest ou flags.
Nova run completa exigida no novo head. Preview8c99 não certifica o novo SHA.
