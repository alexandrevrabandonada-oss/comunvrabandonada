# COMUN 48.1B-P3A — preflight remoto de anexos

Data: 2026-08-07

Branch/PR: `codex/48-1b-p3a-private-attachments`, PR draft `#183`, commit
`330bafc`.

## Estado

- Baseline: `origin/main=9f00890c61e9cf15f5527524e40b43c0e16ddf4f`.
- `supabase migration list --linked`: cadeia do núcleo privado presente,
  incluindo a correção forward-only de anexos; a release histórica externa de
  Calçadas continua fora do ledger do CLI.
- `supabase db push --linked --dry-run`: vazio (`upToDate=true`) após quarentena
  temporária somente da migration externa, restaurada com SHA
  `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`.
- Bucket esperado: `comun-relata-private`.

## Limite de prova

A leitura do painel Vercel mostrou a variável `SUPABASE_SERVICE_ROLE_KEY`
configurada, mas o `vercel env pull --environment production` disponibilizou
valor vazio para esta sessão. Sem uma credencial server-side utilizável não é
possível provar por consulta read-only o `public=false`, políticas de Storage,
RLS, grants e RPCs no projeto remoto. Nenhuma chave foi registrada no relatório.

Resultado: `COMUN_P3A_BLOCKED_REMOTE_ATTACHMENT_PREFLIGHT_PERMISSION`.

Não houve escrita remota, criação de fixture, alteração de migration, ativação
de flag ou acesso a objetos reais.
