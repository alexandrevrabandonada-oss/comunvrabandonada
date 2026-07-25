# Tijolo 43 — reconciliação local determinística

Atualizado em 24 de julho de 2026.

## Decisão vigente

`COMUN_CALCADAS_RELEASE_REHEARSAL_PENDING`

A migration e seu manifesto foram reconciliados somente contra Supabase local.
A promoção permanece bloqueada até o rehearsal do release concluir em uma
pilha Ubuntu íntegra no CI e registrar o ledger definitivo.

## Escopo preservado

- branch: `codex/tijolo-43-calcadas-ciclo-operacional`;
- HEAD de partida: `2251eaf8cecbe44b3d0b0d0cbb052fa88a4ee282`;
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
decisão permanece pendente até esse job verde no novo SHA.

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
