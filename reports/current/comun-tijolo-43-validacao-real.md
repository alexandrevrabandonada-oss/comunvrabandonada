# Tijolo 43 — correção e validação real

Atualizado em 25 de julho de 2026.

## Decisão

`COMUN_CALCADAS_FAST_PATCH_REQUIRED`

O lote corrige a diferença entre o contrato declarado e a implementação local.
O texto original passou a `private_notes`; `public_summary` começa nulo e só é
preenchido por revisão humana antes da publicação. A migration local
`20260724233256_comun_sidewalk_operational_hardening.sql` é necessária para
tornar esse contrato explícito, registrar complemento privado, recuperar locks
e preservar decisões de duplicidade. Seu manifesto está em
`supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json`.

## Evidência local esperada

- upload limitado antes da URL assinada (hora, dia, tickets abertos e bytes);
- lock de confirmação datado, com retomada após cinco minutos;
- confirmação repetida retorna o mesmo registro após concluída;
- falha de validação é final; falha transitória é recuperável;
- compensação remove registro, item, asset e objeto privado parciais;
- publicação exige resumo sanitizado e mantém o registro interno em falha;
- pedido de complemento contém campo, orientação, prazo e URL acionável;
- duplicidade é apenas sugerida e decidida por editor autorizado;
- mapa manual tem foco, setas e confirmação por Enter/Espaço.

## Reconciliação local posterior

As duas rodadas estruturais independentes produziram fingerprints PRE iguais e
fingerprints POST iguais. O checksum final e o validator SQL foram validados.
O teste do runner passou duas vezes, 18/18 em cada rodada, após trocar a porta
fixa por uma porta Docker efêmera validada e removida com o container temporal.
A execução da migration pelo runner real ainda não foi concluída: a pilha
Supabase local ficou incompleta em Windows e a aplicação incremental encontrou
`storage.buckets` indisponível. O job Ubuntu
`RELEASE / COMUN_RELEASE_REHEARSAL` foi executado sem tocar no remoto. O
checkout imutável e o PRE real coincidiram com o contrato, mas a primeira
execução do runner encerrou com `SOLO_CANONICAL_DATABASE_QUERY_FAILED` antes
do POST. Não há ledger definitivo nem resultado `ALREADY_APPLIED` a declarar.

O FAST também falhou somente nos transportes do PostgreSQL temporário no
Ubuntu. A causa é uma incompatibilidade de conectividade Docker no runner
Linux; não é evidência de erro na migration, no checksum ou nos fingerprints.
Vercel Preview passou e FULL foi pulado.

Ver `reports/current/comun-tijolo-43-reconciliacao-local.md` para a evidência
sanitizada completa.

## Correção de transporte T43.1

O cliente `psql` executado pelo runner e o PostgreSQL temporário/Supabase são
containers irmãos. A rota anterior dependia do loopback do host, que existe no
Docker Desktop local mas não é uma rota válida entre containers no Ubuntu do
GitHub Actions. A correção cria/descobre uma rede Docker explícita e conecta o
cliente pelo alias interno (`postgres-test:5432` nos testes e `db:5432` no
rehearsal). A allowlist continua restrita a `LOCAL_VALIDATION`, inclusive para
a nova rota, e valida o nome da rede antes de invocar Docker.

O runner passou 18/18 duas vezes. Os gates que exigem uma stack Supabase local
não puderam ser reexecutados nesta máquina porque o container de banco local
não existia; isto não foi convertido em aprovação. O próximo veredito é o
FAST remoto e o rehearsal do mesmo SHA; até lá, a decisão não muda.

## Limites honestos

Não houve migration remota, escrita no Supabase remoto, merge, domínio,
deploy manual, abertura de piloto ou preenchimento do gate humano. O gate
humano segue 0/3. A promoção controlada da migration e a validação remota
continuam necessárias antes de qualquer declaração de disponibilidade pública.
Segundo checkpoint T43.1: FAST verde; rehearsal pendente de nova rodada.
O FAST da PR no SHA `5503e02` aprovou reset, DB lint e RLS, e o rehearsal alcançou `db:5432`; a falha posterior foi somente a serialização de tabulação no fingerprint do runner. O PRE independente era correto. A correção não toca migration, checksum ou manifesto e segue pendente de novo FAST/rehearsal antes do FULL.
