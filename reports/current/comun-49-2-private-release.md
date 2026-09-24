# COMUN 49.2 — release privada R1+R2

Estado: **pacote privado preparado para revisão; nenhuma migration R1/R2 foi aplicada em Production**.

## Fase A: merge dormente

- PR #432: head funcional `20faea49e86992f85ff5d26e33b028187572e5ee`, base `8bcefdd915e6352b42fcb48e76ad14a9ed98581f`, checks aplicáveis e Preview exato verdes antes do merge.
- Merge normal `438cf7e7bb630b08ccac348d3e0859dda2c02692`, tree `fb7eea2e41297d9dc53fa2133eda8d96ef01d42f`, em 2026-09-24 14:54:10 UTC. R1 e R2 entraram no código sem schema write.
- Deployment Git automático Vercel Production ligado ao merge SHA: GitHub deployment `6640860401`, status `success`. Smoke GET de `/comun`, `/comun/denuncias`, `/comun/relatar` e `/comun/minha-participacao`: HTTP 200; PMTiles Range: HTTP 206. Os workflows pós-merge aplicáveis passaram.
- Estado da aplicação após merge: `COMUN_49_2_A0_R2_MERGED_DORMANT`.

## Fase B: evidência de Production apenas read-only

- Run de captura `36018063341`: transação read-only confirmada, R1/R2 ausentes do ledger, quatro tabelas privadas e quatro bridges R2 ausentes, zero findings canônicos, Hardening v2 ledger `PRESENT_ACCEPTED`, PostgreSQL 17.6. Artefato sanitizado SHA-256 `e8bff2fdae5e6ac49391757ef10fa24de759ef1903d9b7660c3790408117f015`.
- Fingerprint PRE do runner: `a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98`; fingerprint canônico: `cb3bea0cb9abc6534760533d9c52a6471981a3a9672db8780c1ae4294995b1ee`.
- Run read-only de privilégios `36023542092`: conexão e owner do schema `private` = `postgres`; o papel `postgres` possui `USAGE`/`CREATE` em `private`, `CREATE` em `public`, `REFERENCES` em `auth.users` e `INSERT` nos ledgers de migrations e release. Artefato sanitizado SHA-256 `abe126737f537bcbfedfd8e0b1f389b568600f15a0797414147de94c0af1bdf4`. O PRE repetido manteve SHA-256 idêntico.
- Esse estado é `COLLECTIVE_RUNTIME_CODE_PRESENT_SCHEMA_ABSENT`; a captura não aplicou DDL/DML.

## Pacote revisável

- Draft PR #438, branch `codex/comun-49-2-private-collective-runtime-release`, base merge SHA acima.
- Manifest: `supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json`. R1 SHA-256 `8795edb8fbd5359581294b7d0696cf8c3621b81dd5c994acb262d562bbad6b8d`; R2 SHA-256 `c2937990d38f6516f9e95c2a6fdbd77c11477450281a79b6efb3d0556f06958b`. As migrations existentes não foram editadas.
- O bundle fixa a ordem R1 → R2, PRE/PARTIAL_R1/POST, zero findings esperados, ausência de SQL destrutivo e uma identidade lógica para o ledger `public.comun_schema_releases`. O hash do conjunto ordenado é `b07c45a827b32b6627bb880fab5b6c536a1784c06eb8c4a1a9e6cdb9a010041d`.
- A state machine bloqueia estados divergentes, retoma R2 se R1 estiver exatamente comprovado, reconhece POST antes da gravação lógica do ledger e trata replay de POST sem reaplicar migrations.
- A prova descartável usa PostgreSQL 17.6 em imagem Supabase fixada por digest, parte de fixture POST-Hardening e compara o PRE à captura Production. O fixture restaurado não preserva todos os privilégios efetivos de `postgres`; grants locais de executor são concedidos somente ao aplicar uma migration e revogados antes de cada fingerprint. A captura de privilégios Production acima comprova a capacidade efetiva do executor real. PRE e POST não carregam esses grants transitórios. O fingerprint canônico PARTIAL_R1 sem grants transitórios é `208786bc2f6b595831e0a073f3bf7aac97fea955ce47e454cfde7d7e2ddc2c59`; POST é `34f99d5ca5c7d2d15df48586051b26baa179ba82b81c86f323e2a2fef2dae51b`.
- O runner preparado permanece sem gatilho de escrita Production. Uma promoção futura deve exigir SHA exato, CI verde, nova captura read-only, comparação da state machine, aplicação forward-only, ledger, segurança, smoke privado e autorização humana explícita. Este PR não adiciona label `comun:promover` nem aciona workflow de promoção.

## Validação executada até aqui

- Local: 1.310 unitários em 234 arquivos, 113 testes solo, TypeScript, ESLint, build, privilege lint (51 migrations), validator SECURITY DEFINER (2 migrations, 11 funções), testes focais do bundle/state machine e `git diff --check` passaram.
- Local: os 34 testes do promotion runner legado ficaram **BLOCKED** por Docker engine indisponível (`COMUN_TEST_POSTGRES_NETWORK_START_FAILED`), não contam como PASS local. Os mesmos 34 testes passaram no runner Linux da run `36023542045`.
- Run R1 descartável `36023542323`: **PASS** para fundação privada, revogação e concorrência. Run R1+R2 `36023542065`: **PASS** com Auth local real, grants, isolamento A/B, revogação e concorrência. Ambas rodaram no SHA `7d8c8072bfa71dfef457aeb800fa7a8e75328245`; as migrations não mudaram desde então.
- Run Production-like `36023542045` no mesmo SHA: **PASS** para PRE idêntico ao Production, PARTIAL_R1, POST, zero findings, quatro bridges públicas executáveis somente por `service_role`, ausência de projeção pública, ledger lógico e fingerprint estável após o ledger. Os 34 testes do promotion runner legado passaram; o executor forward-only independente concluiu `R1,R2,LEDGER`. Replay/retomada e bloqueio de divergência passaram nos testes de state machine.
- COST-02/Preview do PR #438 ainda exige checkpoint `[comun-preview]` no SHA funcional final e GitHub Deployment Preview `success` do SHA exato.

## Sequência de promoção futura — não acionada

1. Autorizar humanamente o SHA exato aprovado e exigir CI/Preview verdes para esse SHA. Executar o código de promoção somente da `main` revisada; recusar PR/head móvel.
2. Capturar novamente Production em transação read-only com `default_transaction_read_only=on`, mantendo a credencial confinada ao job de captura. Comparar os seis privilégios do executor, Hardening ledger, zero findings, versões e fingerprints contra o manifest. Qualquer diferença leva a `DIVERGED` e bloqueia escrita.
3. Reproduzir o mesmo PRE em banco descartável sem secrets Production e exigir as provas R1, R2, state machine, grants, runtime privado e ausência de projeção pública. Exportar checkpoint sanitizado ligado a SHA/run.
4. Após gate humano separado para schema write, executar o runner somente se o estado for `PRE`, `PARTIAL_R1` ou `POST_PENDING_LEDGER`. Cada migration e seu registro em `supabase_migrations.schema_migrations` entram na mesma transação; R1 nunca é reaplicada sobre PARTIAL_R1. O ledger lógico do bundle é registrado somente depois de POST comprovado. POST com ledger aceito é replay sem escrita.
5. Recapturar POST, exigir zero findings e grants esperados, executar smoke autenticado estritamente privado e smoke da aplicação. Nenhuma ação cria candidato, projeção, mapa ou publicação.

Antes de qualquer superfície pública, a contenção lógica de falha é manter Server Actions de entidades indisponíveis/sem chamada enquanto se corrige o estado por avanço controlado. Não há down migration destrutiva nem promessa de atomicidade entre duas migrations: `PARTIAL_R1` e `POST_PENDING_LEDGER` são estados recuperáveis explícitos. Nesta rodada nenhum job recebe autorização de escrita Production e nenhum workflow de promoção é disparado.

## Limite

R3, candidate pipeline, projeção pública, mapa, publicação e qualquer migration Production continuam fora do escopo. A futura promoção de schema requer decisão humana separada depois da revisão deste PR.
