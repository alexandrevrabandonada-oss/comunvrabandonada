# Estado do COMUN — Sprint 22 — Fila de fotografias

Data: 2026-07-14

## Arquitetura

Fila persistida no Supabase com jobs, tentativas e eventos. Claim atômico usa `FOR UPDATE SKIP LOCKED`. O admin enfileira sem executar Sharp; worker server-only processa até três jobs por chamada ou 40 segundos.

## Idempotência e worker

A chave inclui asset, SHA-256, receita `v1` e parâmetros. Derivados usam keys determinísticas. Retry consulta banco e HEAD antes de gravar; assets existentes com checksum compatível são reutilizados. Thumbnail e display permanecem `pending`; direitos, créditos e publicação não mudam automaticamente.

## Recuperação e segurança

Backoff: imediato, 1, 5 e 30 minutos. Falhas permanentes ou tentativas esgotadas vão para dead-letter. Locks com mais de 15 minutos são recuperados. Cancelamento imediato vale para queued/retry e `cancel_requested` para processing. Original nunca é removido. RLS bloqueia anon/auth e concede apenas service role.

## Operação

Painel, detalhe, dead-letter e botão “Processar fila agora” disponíveis em `/comun/admin/acervo/processamento`. Endpoint interno aceita POST com `CRON_SECRET`; não foi configurado cron GET incompatível. Métricas registram duração, bytes, download, Sharp/upload e idempotency hit. Estimativa operacional baseada nos registros do COMUN, não fatura oficial.

## Cleanup e testes

Auditoria de pares incompletos é dry-run e nunca apaga originais, assets aprovados publicados ou arquivos fora do prefixo. Lint, TypeScript, build e 16 testes unitários passaram. Migration remota e DB lint passaram; matriz RLS resultou `RLS_MATRIX_OK`.

## Deploy e gate real

Deploy de produção concluído em `https://comunvrabandonada.vercel.app`. O gate server-side `archive_queue_production` passou em 14.651 ms: storage privado 630 ms, Sharp 17 ms, storage público 668 ms, banco 1.454 ms, fila/claim/idempotência/worker/completion 6.169 ms e publicação/despublicação 2.109 ms. Cleanup confirmado para original, derivados base, derivados determinísticos, registros e job. Derivados foram criados `pending` e nenhum item permaneceu publicado.

## Riscos

Processamento ainda ocorre em função Vercel e pode atingir memória em imagens extremas. Cancelamento cooperativo é observado entre jobs, não interrompe Sharp em andamento. O domínio de mídia continua temporariamente em r2.dev.

## Próximo tijolo

Adicionar execução agendada POST por scheduler autenticado e alertas de dead-letter/cleanup_required.
