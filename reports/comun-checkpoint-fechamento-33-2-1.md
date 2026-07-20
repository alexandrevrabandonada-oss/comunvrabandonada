# Checkpoint — Fechamento Sprint 33.2.1

**Data/hora:** 2026-07-17 (capturado no início do fechamento)
**Branch:** `codex/comun-admin-auth-remote`
**Commit:** `3a01e91 test: torna suites autenticadas independentes`

## Git

### `git status --short`

```
 M reports/screenshots/sprint-33-2-1-expired-1366x768.png
 M reports/screenshots/sprint-33-2-1-expired-360x800.png
 M tests/editorial-operation-authenticated-visual/operation.spec.ts
 M tests/editorial-operation-authenticated/personas.spec.ts
 M tests/fixtures/comun/operational-global-setup.mjs
 M tests/fixtures/comun/operational-global-teardown.mjs
?? reports/estado-atual-comun-2026-07-17.md
```

### `git diff --stat`

6 arquivos alterados, 17 inserções / 62 remoções. Mudanças concentram-se na independência das suites autenticadas (storageState por persona gerado no setup global).

## Containers e serviços Supabase

- Docker Desktop em transição no início da captura (`docker ps` falhou por pipe ausente); estabilizou em seguida.
- `npx supabase status`: setup local **ativo** após estabilização.
  - API: `http://127.0.0.1:55431`
  - DB: `postgresql://postgres:postgres@127.0.0.1:55432/postgres`
  - Studio: `http://127.0.0.1:55433`
  - Mailpit: `http://127.0.0.1:55434`
- Serviços parados: `supabase_imgproxy`, `supabase_edge_runtime`, `supabase_pooler` (não usados pelos gates desta sprint).

## Estado do Auth e das tabelas de identidade

Resíduos de execuções anteriores encontrados **antes** de qualquer ação deste fechamento:

| Tabela | Linhas | Observação |
|---|---|---|
| `auth.users` | 10 | Todas `fixture-s33-2-mrp0pwmm-e0f039a9-*@comun.test` (run de 14:13–14:15); faltam 4 personas (result_editor, radio_editor, art_editor, participant) — cleanup parcial |
| `auth.identities` | presentes | Uma identity `email` por usuário residual |
| `comun_member_profiles` | **109** | Inclui 24+ "Participante fixture" e múltiplas gerações "Fixture \<persona\>" — **cleanup não remove member_profiles** |
| `comun_admin_users` | **92** | Emails de pelo menos 6 run_ids antigos (`mroyjein`, `mroyl4n3`, `mroyr3t6`, `mroyrvxk`, `mrozn2kf`, `mrozv0r1`, `mrp0pwmm`) — cleanup por prefixo não foi executado ou falhou em runs interrompidos |
| `comun_admin_profiles` | 10 | Coerente com os 10 auth.users residuais |
| `comun_editorial_operation_items` | 0 | Fixtures de dados removidas corretamente |

**Leitura:** runs anteriores foram interrompidos antes do teardown ou o teardown falhou parcialmente; `member_profiles` e `admin_users` acumulam órfãos de vários runs.

## storageStates e fixtures em disco

- `.local/comun-auth/`: **ausente** — nenhum storageState residual.
- `.local/`: vazio.
- Nenhum cookie/sessão persistida em disco.

## Processos Next e portas

- Nenhum processo Next escutando (portas 3000–3002 livres).
- 1 processo `node.exe` (PID 20472) — sem porta de app; não é servidor Next.
- Portas Supabase 55431/55432/55433 escutando (PIDs 18380/23264 — infra local).

## config.toml

- `[db.seed] enabled = true`, `sql_paths = ["./seed.sql"]`.
- `supabase/seed.sql`: **AUSENTE**.
- `[auth] sign_in_sign_ups = 300` (rate limit de sign-in configurado para suportar suites de teste).
- Storage local habilitado, buckets declarados: `archive-private-originals`, `archive-public-derivatives`, `radio-private-originals`, `radio-public-audio`.

## Variáveis

### `.env.example` (documentadas)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `COMUN_BOOTSTRAP_ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_PROJECT_ID`, `COMUN_LOOKUP_HASH_SALT`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_ORIGINALS`, `R2_BUCKET_PUBLIC`, `R2_PUBLIC_BASE_URL`.

**Ausente:** `MEDIA_STORAGE_PROVIDER`.

### `.env.local` (nomes apenas, valores omitidos)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `COMUN_ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_PROJECT_ID`.

## Conclusões do checkpoint

1. Ambiente local funcional; Supabase ativo após estabilização do Docker.
2. **Resíduos de fixtures acumulados** em `member_profiles` (109) e `admin_users` (92) — o contrato de cleanup atual é insuficiente.
3. `seed.sql` ausente com seed habilitado — pendência do contrato de reset.
4. `MEDIA_STORAGE_PROVIDER` não documentada — pendência de documentação.
5. Nenhum storageState/processo Next residual em disco/memória.

## Declarações

- Piloto público: NÃO ABERTO
- Deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Dados reais: NÃO UTILIZADOS
- Custo externo: R$ 0
