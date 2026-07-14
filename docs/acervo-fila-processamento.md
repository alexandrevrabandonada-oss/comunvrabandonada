# Fila de processamento do Acervo

A fila reside no Supabase. O admin apenas enfileira; Sharp roda no worker server-only. O claim usa `FOR UPDATE SKIP LOCKED`, no máximo três jobs e margem de 40 segundos. A chave combina asset, checksum, receita `v1` e parâmetros. Keys R2 são determinísticas.

Sem cron, o painel `/comun/admin/acervo/processamento` executa o mesmo worker de forma protegida. O endpoint interno aceita somente POST com `CRON_SECRET`.
