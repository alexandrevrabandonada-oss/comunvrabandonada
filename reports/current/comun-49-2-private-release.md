# COMUN 49.2 — release privada R1+R2

Estado: **em revisão técnica; nenhuma migration R1/R2 foi aplicada em Production**.

## Fase A: merge dormente

- PR #432: head funcional `20faea49e86992f85ff5d26e33b028187572e5ee`, base `8bcefdd915e6352b42fcb48e76ad14a9ed98581f`, checks aplicáveis e Preview exato verdes antes do merge.
- Merge normal `438cf7e7bb630b08ccac348d3e0859dda2c02692`, tree `fb7eea2e41297d9dc53fa2133eda8d96ef01d42f`, em 2026-09-24 14:54:10 UTC. R1 e R2 entraram no código sem schema write.
- Deployment Git automático Vercel Production ligado ao merge SHA: GitHub deployment `6640860401`, status `success`. Smoke GET de `/comun`, `/comun/denuncias`, `/comun/relatar` e `/comun/minha-participacao`: HTTP 200; PMTiles Range: HTTP 206. Os workflows pós-merge aplicáveis passaram.
- Estado da aplicação após merge: `COMUN_49_2_A0_R2_MERGED_DORMANT`.

## Fase B: evidência de Production apenas read-only

- Run de captura `36018063341`: transação read-only confirmada, R1/R2 ausentes do ledger, quatro tabelas privadas e quatro bridges R2 ausentes, zero findings canônicos, Hardening v2 ledger `PRESENT_ACCEPTED`, PostgreSQL 17.6. Artefato sanitizado SHA-256 `e8bff2fdae5e6ac49391757ef10fa24de759ef1903d9b7660c3790408117f015`.
- Fingerprint PRE do runner: `a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98`; fingerprint canônico: `cb3bea0cb9abc6534760533d9c52a6471981a3a9672db8780c1ae4294995b1ee`.
- Run read-only de privilégios `36022306227`: conexão e owner do schema `private` = `postgres`; o papel `postgres` possui `USAGE`/`CREATE` em `private`, `CREATE` em `public` e `REFERENCES` em `auth.users`. Artefato sanitizado SHA-256 `9241d87f65be579d9263e02f24c0b15068fa3d0e605bcf55f3c246a148cc96aa`. O PRE repetido manteve SHA-256 idêntico.
- Esse estado é `COLLECTIVE_RUNTIME_CODE_PRESENT_SCHEMA_ABSENT`; a captura não aplicou DDL/DML.

## Pacote revisável

- Draft PR #438, branch `codex/comun-49-2-private-collective-runtime-release`, base merge SHA acima.
- Manifest: `supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json`. R1 SHA-256 `8795edb8fbd5359581294b7d0696cf8c3621b81dd5c994acb262d562bbad6b8d`; R2 SHA-256 `c2937990d38f6516f9e95c2a6fdbd77c11477450281a79b6efb3d0556f06958b`. As migrations existentes não foram editadas.
- O bundle fixa a ordem R1 → R2, PRE/PARTIAL_R1/POST, zero findings esperados, ausência de SQL destrutivo e uma identidade lógica para o ledger `public.comun_schema_releases`. O hash do conjunto ordenado é `b07c45a827b32b6627bb880fab5b6c536a1784c06eb8c4a1a9e6cdb9a010041d`.
- A state machine bloqueia estados divergentes, retoma R2 se R1 estiver exatamente comprovado, reconhece POST antes da gravação lógica do ledger e trata replay de POST sem reaplicar migrations.
- A prova descartável usa PostgreSQL 17.6 em imagem Supabase fixada por digest, parte de fixture POST-Hardening e compara o PRE à captura Production. O fixture restaurado não preserva todos os privilégios efetivos de `postgres`; grants locais de executor são concedidos somente ao aplicar uma migration e revogados antes de cada fingerprint. A captura de privilégios Production acima comprova a capacidade efetiva do executor real.
- O runner preparado permanece sem gatilho de escrita Production. Uma promoção futura deve exigir SHA exato, CI verde, nova captura read-only, comparação da state machine, aplicação forward-only, ledger, segurança, smoke privado e autorização humana explícita. Este PR não adiciona label `comun:promover` nem aciona workflow de promoção.

## Validação executada até aqui

- Local: 1.310 unitários em 234 arquivos, 113 testes solo, TypeScript, ESLint, build, privilege lint (51 migrations), validator SECURITY DEFINER (2 migrations, 11 funções), testes focais do bundle/state machine e `git diff --check` passaram.
- Local: os 34 testes do promotion runner legado ficaram **BLOCKED** por Docker engine indisponível (`COMUN_TEST_POSTGRES_NETWORK_START_FAILED`), não contam como PASS. Serão executados no CI descartável.
- Run descartável `36021320539` passou PRE/POST, privacidade das bridges e ledger lógico. A recaptura do fingerprint PARTIAL_R1 sem grants transitórios está em andamento; o manifest será atualizado conforme o artefato final.
- COST-02/Preview do PR #438 ainda exige checkpoint `[comun-preview]` no SHA funcional final e GitHub Deployment Preview `success` do SHA exato.

## Limite

R3, candidate pipeline, projeção pública, mapa, publicação e qualquer migration Production continuam fora do escopo. A futura promoção de schema requer decisão humana separada depois da revisão deste PR.
