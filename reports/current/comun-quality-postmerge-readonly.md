# Quality pós-merge: verificação de schema read-only

Base: `2c5d974d3ddf1b2c027d85b156a3f8a5ae4618f1` (merge autorizado do PR #521).

## Finding demonstrado

A run `37714655609` de Quality chamou o transportador histórico de schema automaticamente após o merge. A solicitação de cancelamento não interrompeu esse passo: o transporte terminou às 01:49:39 UTC e o cancelamento tornou-se efetivo às 01:50:05 UTC. O artifact `11523392689` registrou `migrationsApplied=0` e `idempotentReplays=1`. Portanto, não houve reaplicação de migration naquele passo. O script também envia `pg_notify('pgrst','reload schema')` em replay; não se certifica ausência de todos os efeitos no banco. A run permanece CANCELLED, não PASS.

## Correção focal

O job automático passa a chamar `verify-comun-quality-remote.mjs`, nunca o transportador. A conexão exige `default_transaction_read_only=on`; a transação começa com `BEGIN READ ONLY`, comprova `transaction_read_only=on` e termina com `ROLLBACK`. Nenhuma ausência autoriza instalação. O histórico precisa estar presente; os seis controles anteriores de relação, assinatura, RLS e grants permanecem obrigatórios, com rejeição de formatos inesperados. A identidade e os bytes da release são conferidos antes da conexão.

A credencial Production fica exclusivamente no passo de inspeção, sem exposição aos demais scripts, instalação de dependências ou navegador. O transportador histórico não foi modificado; nenhum workflow chama esse arquivo após a correção. Migrations, manifests, produto, flags e lançamento não foram alterados.

Esse isolamento reduz a superfície da credencial, mas não transforma uma credencial privilegiada em uma identidade incapaz de escrever: código malicioso que alterasse deliberadamente esse passo poderia abrir outra conexão. Um papel persistente limitado a leitura exigiria um gate separado de infraestrutura e não foi criado nesta rodada.

## Validação local

- PASS: 21 testes novos e 1 contrato Quality existente em Node no Windows. Incluem ausência de histórico, booleanos inválidos, read-only ausente, cada controle original, formato incompleto, sanitização, rollback e análise semântica YAML do escopo da credencial.
- PASS: 3 testes existentes do runner de performance em Linux Node 22.19.0. Dois deles falham no Windows por dependerem de PATH/comandos POSIX; nenhuma alteração foi feita para contornar esse comportamento.
- PASS: 4 testes Vitest de Quality/PWA, 113 testes solo, ESLint dos novos scripts e `git diff --check`.
- PASS: PostgreSQL descartável real com fixture sintética de metadados. Verificador positivo; histórico ausente, grant anônimo e RLS desativado bloqueados; DDL/DML recusados com `25006`; restauração comprovada; zero dados de negócio. Essa prova não substitui Auth nem a validação do schema completo.
- NOT_RUN: novo verificador contra Production. Nenhuma conexão Production foi aberta para construir esta correção. O caminho automático só mudará após revisão e merge separados.

O artifact local registra o SHA de origem e SHA-256 do helper. Provas feitas antes do commit não são atribuídas ao commit posterior sem nova execução. Os resultados remotos devem ser vinculados ao head efetivamente testado no corpo do PR.

## Reprodução isolada

Com Docker disponível, crie um laboratório novo (nunca reutilize um container de outro projeto):

```sh
docker network create --label comun.proof.run=quality-readonly-repro comun-quality-readonly-repro
docker run --detach --name comun-quality-readonly-repro --label comun.proof.run=quality-readonly-repro --network comun-quality-readonly-repro -p 127.0.0.1::5432 -e POSTGRES_PASSWORD=synthetic-quality-proof --tmpfs /var/lib/postgresql/data postgres:17
node scripts/quality/verify-comun-quality-disposable.mjs comun-quality-readonly-repro quality-readonly-repro
```

O harness verifica label, identidade, bind loopback e senha exclusivamente sintética antes de cada escrita de fixture. Recusa fixture já existente. Aguarde readiness PostgreSQL antes de executar. Ao terminar, confira novamente as labels e remova somente esse container e essa rede; não use prune. A imagem usada na execução deve ser registrada por digest no pacote de evidências. O artifact sanitizado fica em `.ci-artifacts/quality-performance/disposable-readonly.json`.

## Contenção

Sem workflow dispatch, rerun do transporte cancelado, novo merge, migration, deploy manual ou alteração de flags. A correção é entregue em PR draft separado. O deploy Git e smokes públicos do merge #521 passaram; Quality cancelado continua um bloqueio independente do produto.
