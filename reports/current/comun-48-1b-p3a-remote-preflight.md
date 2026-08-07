# COMUN 48.1B-P3A — preflight remoto de anexos

Data: 2026-08-07

Branch/PR: `codex/48-1b-p3a-private-attachments`, PR `#183` mesclada em
`6571c75acc49a234a1258ac8a588ee52ba76600d`.

## Estado

- Baseline: `origin/main=9f00890c61e9cf15f5527524e40b43c0e16ddf4f`.
- `supabase migration list --linked`: cadeia do núcleo privado presente,
  incluindo a correção forward-only de anexos; a release histórica externa de
  Calçadas continua fora do ledger do CLI.
- `supabase db push --linked --dry-run`: vazio (`upToDate=true`) após quarentena
  temporária somente da migration externa, restaurada com SHA
  `6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be`.
- Bucket esperado: `comun-relata-private`.

## Limite de prova histórico (antes do staged)

A leitura do painel Vercel mostrou a variável `SUPABASE_SERVICE_ROLE_KEY`
configurada, mas o `vercel env pull --environment production` disponibilizou
valor vazio para esta sessão. Sem uma credencial server-side utilizável não é
possível provar por consulta read-only o `public=false`, políticas de Storage,
RLS, grants e RPCs no projeto remoto. Nenhuma chave foi registrada no relatório.

Resultado histórico: `COMUN_P3A_BLOCKED_REMOTE_ATTACHMENT_PREFLIGHT_PERMISSION`.

O E2E descartável da PR passou nos runs `31205708682` e `31206331155`, mas isso não substituía a
prova do bucket e das políticas no projeto remoto. Não houve escrita remota,
criação de fixture, alteração de migration, ativação de flag ou acesso a
objetos reais durante o período bloqueado.

## Atualização de credencial e encerramento do bloqueio

Em 2026-08-07, o responsável informou ter rotacionado a chave `service_role`
no painel do Supabase. A rotação não foi usada nem registrada nesta sessão e
ainda não havia sido comprovada no ambiente server-side da Vercel/agente. O
bloqueio foi encerrado pelo deployment staged descrito abaixo; a chave nunca foi
baixada nem exposta nesta sessão.

Após o redeploy informado, `vercel env run -e production` foi executado com o
`.env.local` temporariamente isolado e restaurado por SHA. O URL Supabase e o
project ref foram injetados, mas `SUPABASE_SERVICE_ROLE_KEY` permaneceu ausente
no processo filho. Esse diagnóstico local permaneceu sem acesso ao valor; nenhum
valor de chave foi impresso.

## Preflight staged server-side concluído

Em 2026-08-07 foi criado um deployment Production staged sem alias canônico,
com o ambiente Production da Vercel e a chave mantida exclusivamente no
runtime server-side. O endpoint temporário respondeu somente pelo hostname do
deployment e foi removido antes do candidato de merge.

- Deployment staged: `dpl_J8Ksnhye8ztj6xnqmBrbRtY4KUHt`.
- Resultado: `COMUN_P3A_REMOTE_ATTACHMENT_PREFLIGHT_GREEN`.
- Bucket: existe e `public=false`.
- RPCs observadas: 6/6; probe de leitura server-side com identificadores
  sintéticos inválidos retornou zero resultado sem mutação.
- Leitura privada por anon: bloqueada; baseline authenticated herdado do R2A
  permaneceu exato; service role ficou server-only.
- `/api/comun/internal/p3a-preflight` no domínio canônico respondeu 404.
- `supabase migration list --linked` e `db push --linked --dry-run` após
  quarentena temporária da migration externa: baseline vazio, sem escrita.
- Nenhum segredo, objeto, path, signed URL, coordenada ou conteúdo foi
  registrado.

O endpoint diagnóstico não integra o candidato final; apenas sua remoção e este
registro documental permanecem no diff de fechamento. A flag de anexos foi
ativada somente após o merge; localização e coletivos continuam desligados.
