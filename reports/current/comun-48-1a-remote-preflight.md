# COMUN — 48.1A · preflight remoto

Estado: **pendente**. Esta versão registra o contrato e não contém consulta,
credencial, segredo, PII ou fingerprint remoto inventado.

Antes de qualquer promoção devem ser capturados somente valores sanitizados:
SHA de `main`, deployment `READY`, projeto Supabase, ledger de migrations,
schema e objetos necessários, RLS/grants, buckets privados, Auth sem PII,
flags, hashes de configuração e ausência de drift.

Se qualquer migration desconhecida, drift não forward-only, segredo exposto,
RLS não comprovada ou divergência de fingerprint aparecer, emitir blocker e
não escrever. O preflight não cria usuário, não ativa flag e não envia dados.
