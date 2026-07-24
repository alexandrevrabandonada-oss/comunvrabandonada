# Estado atual do COMUN

Atualizado em 24 de julho de 2026.

## Linha ativa

- repositório: `alexandrevrabandonada-oss/comunvrabandonada`;
- branch única: `codex/tijolo-41-baseline-canonico`;
- PR única: #30, aberta, não draft e mesclável;
- HEAD de partida deste lote:
  `10ef55ef82d530954aade4dcffa68e2569ac6090`;
- HEAD técnico aprovado:
  `9ea9cc8b2cfaee6303fcd1ee8abe15e65c609107`;
- base `main`: `b2f6733dacd15ec21601ed6b6837b42213b87d70`.

## Hardening

A release `20260723220112-canonical-security-hardening` ficou executável pelo
role `postgres` disponível. Ela corrige integralmente o escopo controlável pelo
COMUN e mantém os defaults de `supabase_admin` como observações gerenciadas.

Foram preparados:

- view pública `security_invoker`, RLS e grants de coluna sanitizados;
- defaults futuros pertencentes a `postgres` endurecidos;
- duas funções definer com `search_path=pg_catalog`;
- trigger `auth.on_auth_user_created` preservado;
- ledger privado `public.comun_schema_releases`;
- lint obrigatório de privilégios explícitos;
- runner de release por manifesto, checksum e fingerprints;
- CI com diagnóstico separado e repetição única para 502 transitório.

## Decisão histórica

Estado técnico anteriormente comprovado após FAST, FULL e Vercel no mesmo HEAD:
`COMUN_SECURITY_HARDENING_READY_TO_PROMOTE`.

Evidências:

- captura sanitizada determinística: run `30054188587`;
- FAST: run `30054740000`, sucesso;
- FULL: run `30054740000`, sucesso;
- Vercel Preview: sucesso;
- fingerprint pré:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- fingerprint pós inicialmente projetado:
  `82989755711d63a14d209cc2074fd3656288e74fb030331dac282acac7a8265b`.

Não houve migration remota, merge, alteração de domínio ou mudança em
produção. O gate humano permanece 0/3 e o piloto público fechado.

## Promoção final

O run `30057245879` criou o checkpoint sanitizado `8583227864`, mas interrompeu
o runner forward-only com `SOLO_FORWARD_ONLY_FAILED`. A captura read-only
`30057335078` confirmou rollback total: fingerprint pré inalterado, 9
bloqueantes e ledger ausente. A label foi removida, a PR permanece aberta e a
main não avançou.

## Correção do runner em validação

A causa exata foi reproduzida com PostgreSQL 17: a consulta JSON era executada
no formato tabular padrão do `psql`, e o runner aplicava `JSON.parse` sobre
cabeçalho, separador, documento e contador `(1 row)`. A exceção nativa não
recebia marcador próprio, contribuindo para o diagnóstico genérico no workflow.

O patch separa `executeSql`, `queryJson` e `queryScalar`, canoniza o transporte,
sanitiza todas as falhas de processo e adiciona um preflight remoto
estritamente read-only no `COMUN Nightly`. A migration e seu checksum
permanecem idênticos.

O primeiro ensaio read-only, run `30061056715`, comprovou que o baseline
compacto não contém por contrato triggers de `auth`; a validação antiga
procurava `auth.on_auth_user_created` na projeção errada. O patch passou a
consultar somente a contagem desse trigger em `pg_catalog`, por `queryScalar`.
Nenhuma escrita ocorreu nesse diagnóstico.

Evidências do HEAD técnico corrigido
`12fbb437324086f92d8beefc586d335b5652f8ed`:

- FAST e FULL: run `30061223511`, sucesso;
- Vercel Preview: sucesso;
- preflight remoto read-only: run `30062302321`, sucesso;
- fingerprint remoto:
  `b4d66ad06d1aba22930609f58b0ea1696fbfe5747a21f141dcedc97766d672de`;
- bloqueantes: 9; observações de plataforma: 1; ledger: ausente;
- todos os demais jobs do `COMUN Nightly` foram ignorados.

Essa decisão foi superada pela segunda tentativa controlada.

## Estado canônico após a segunda tentativa

No run `30099519716`, a migration foi confirmada e aplicada dentro da transação,
mas o pós-check interrompeu a promoção com
`SOLO_CANONICAL_POST_FINGERPRINT_MISMATCH`. A captura read-only
`30099668279` confirmou:

- fingerprint real:
  `a8dc235b2f0a1fa2554a7dd0db9c46372867fc21a5f610b47d008e1c15c46197`;
- zero achados bloqueantes;
- uma observação de plataforma e três defaults gerenciados;
- ledger presente;
- cleanup dry-run sem objetos elegíveis;
- `main` ainda em `b2f6733dacd15ec21601ed6b6837b42213b87d70`;
- nenhum merge e nenhum deployment novo.

A divergência ficou limitada a dois privilégios que o projetor pressupunha,
mas a migration corretamente não concedeu: `INSERT` e `DELETE` no ledger para
`service_role`. O contrato local foi reconciliado com o estado remoto mais
restritivo, mantendo os bytes e o checksum da migration aplicada. A tupla
histórica do ledger é aceita apenas por valor completo explicitamente
registrado; qualquer outra divergência continua bloqueante.

Decisão atual: `SOLO_PROMOTION_FAILED`. Antes de qualquer nova autorização, a
correção precisa passar pelos gates locais e por novo preflight exclusivamente
read-only. A label `comun:promover` está ausente; o gate humano permanece 0/3 e
o piloto público continua fechado.
