# Tijolo 43 — reconciliação local determinística

Atualizado em 25 de julho de 2026.

## Decisão vigente

`COMUN_CALCADAS_FAST_PATCH_REQUIRED`

A migration e seu manifesto foram reconciliados somente contra Supabase local.
A promoção permanece bloqueada. O rehearsal comprovou o baseline na pilha
Ubuntu, mas o cliente PostgreSQL em container não alcançou o banco local pelo
transporte usado pelo runner no GitHub Actions.

## Escopo preservado

- branch: `codex/tijolo-43-calcadas-ciclo-operacional`;
- HEAD de partida: `2251eaf8cecbe44b3d0b0d0cbb052fa88a4ee282`;
- HEAD atual da PR #35 draft: `4ca09221f4d4720ac0da6cca1dab871ecdda8e46`;
- base canônica: `4a9e2d4f341e755b3a1aa969c26344f4f4334bae`;
- antes deste checkpoint: nenhum commit, push, merge, deploy, promoção,
  domínio ou Supabase remoto;
- gate humano: 0/3; piloto público: fechado.

## Evidência determinística de schema

| Rodada | Antes | Depois |
| --- | --- | --- |
| 1 | `a6599aa24658c4339c7518d484364699d07ca4fa9cb1db68bb6fed4c20b94a10` | `614908b735616fc64d4d36bc05e050ee53a0fb2b1f4e099febe1f327923350c4` |
| 2 | `a6599aa24658c4339c7518d484364699d07ca4fa9cb1db68bb6fed4c20b94a10` | `614908b735616fc64d4d36bc05e050ee53a0fb2b1f4e099febe1f327923350c4` |

As duas rodadas equivalem. O checksum congelado da migration é
`4157a3f2ce81255217b7dd7df8639770ea352ae890aea1ec69b9def183f821e8`.

## Contrato validado localmente

- uma única transação e uma única exceção: `public_summary DROP NOT NULL`;
- status físico histórico de upload preservado;
- `confirmation_state` separado, com recuperação de lock;
- texto de registro interno transferido para `private_notes`, sem alterar
  automaticamente registro público;
- tabela privada de sugestões de duplicidade sob RLS, sem grants a `anon` ou
  `authenticated`;
- selector explícito do manifesto, checksum, validator SQL e testes do runner.

`npm run solo:sql:validate` passou. O teste do runner passou duas vezes,
18/18 em cada rodada, com JSON, escalar e ledger confirmados. O teste deixou
de fixar a porta `55441`: o Docker reserva uma porta de loopback efêmera,
validada antes de construir a conexão, e o container aleatório é removido no
início, em falha e no encerramento.

## Bloqueio remanescente

A execução da migration pelo runner real ainda não foi declarada aprovada. Na
reconstrução local em Windows, o Supabase iniciou uma pilha incompleta; a
aplicação incremental das migrations encontrou `storage.buckets` indisponível.
Não foi simulado ledger, nem emitido `ALREADY_APPLIED`.

Para substituir essa limitação sem escrita remota, o CI recebeu o job
`RELEASE / COMUN_RELEASE_REHEARSAL`: ele sobe a pilha Supabase local em Ubuntu,
seleciona o manifesto explícito, executa o runner duas vezes, faz DB lint,
RLS e limpeza de fixtures. O job publica somente evidência sanitizada. A
decisão permanece bloqueada até a correção do transporte Docker no Linux.

## Checkpoint remoto do CI, sem escrita de dados

No run `30141194406`, o rehearsal fez checkout imutável do SHA da PR e
confirmou Auth, Storage, REST e banco locais. O artefato sanitizado registrou:

- PRE real:
  `a6599aa24658c4339c7518d484364699d07ca4fa9cb1db68bb6fed4c20b94a10`;
- primeira execução: status `1`, marcador
  `SOLO_CANONICAL_DATABASE_QUERY_FAILED`;
- POST e segunda execução: `NOT_REACHED`;
- nenhuma escrita remota.

O FAST passou por `solo:test`, mas falhou nos três testes de transporte do
PostgreSQL temporário (15/18 restantes aprovados). O problema é específico ao
acesso Docker no Ubuntu; localmente, o runner segue 18/18. Vercel Preview
passou e FULL foi pulado, sem disparo manual. O artifact é
`comun-release-rehearsal-30141194406` (ID `8614517321`).

## Preparação WSL posterior

Foi criada uma base em `~/comun-t43-base` e um candidato em
`~/comun-t43-candidate2`, ambos no filesystem Linux. Docker e Compose estão
acessíveis; Node `v22.23.1`, npm `10.9.8` e `supabase@2.109.1` via `npx` são
nativos do Ubuntu. O trabalho local foi preservado em patch e arquivo de não
rastreados antes da cópia.

A reinstalação de dependências encontrou cache corrompido e concorrência entre
processos `npm ci`. O cache foi limpo e os processos antigos foram encerrados,
e as instalações limpas posteriores concluíram com lockfiles intactos e
typecheck verde nos dois worktrees.

Na tentativa seguinte de iniciar a base pelo WSL, a CLI iniciou somente
`supabase_db_COMUM_VR_ABANDONADA`; Auth, Storage e PostgREST ficaram parados,
e o container de Storage sequer foi criado. A stack foi parada sem executar
`db reset`, SQL incremental, runner ou migration candidata. Não houve migration
histórica aplicável a registrar: o bloqueio ocorreu antes dessa etapa.

Logo, a pilha WSL, o runner e o ledger definitivo continuam **não executados**.

## Correção de transporte T43.1

O erro do Ubuntu foi delimitado como transporte entre containers, não como
schema: o `psql` do runner era iniciado em um container distinto e apontava
para a porta de loopback publicada pelo host. No GitHub Actions Linux essa
rota não leva ao banco irmão. O patch substitui a rota por rede Docker
explícita e alias interno: `postgres-test:5432` no PostgreSQL temporário e
`db:5432` na rede descoberta da stack Supabase do rehearsal. A URL interna só
é aceita quando `SUPABASE_PROJECT_REF=LOCAL_VALIDATION`, a allowlist contém
esse ref e o nome da rede passa validação estrita.

O runner afetado passou duas vezes, 18/18, incluindo JSON, escalar e ledger.
Nesta máquina, a rodada complementar não iniciou porque
`supabase_db_nvmdszymrtacfehdynpg` não existia; o smoke runtime, RLS matrix e
DB lint registraram bloqueio local, sem migration, reset ou escrita remota.
O FAST e o rehearsal Ubuntu são a próxima evidência exigida; FULL continua
proibido até ambos passarem no mesmo SHA.
Adendo da segunda execução Ubuntu: no run 30142369944, FAST passou e o cliente recebeu `db:5432 - accepting connections`. O artefato 8614915448 registra PRE independente igual ao esperado, POST e segunda passagem não alcançados, `remote_writes=none`; a falha foi somente a serialização de tabulação do fingerprint no runner, agora corrigida e protegida por teste 19/19 duas vezes.
