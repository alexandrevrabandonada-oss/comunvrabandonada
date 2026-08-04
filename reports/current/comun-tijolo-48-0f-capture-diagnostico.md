# Tijolo 48.0F — diagnóstico de captura e convergência

Data: 4 de agosto de 2026. Branch: `codex/tijolo-48-0f-capture`.

## Baseline

`git fetch --all --prune` confirmou `origin/main` em `87277aa2b7a58ea7a9bcd9f260082519beca25fc`, descendente legítimo do merge do 48.0E. A rota legada `/comun/relatar` grava em `public.comun_reports` e usa o formulário existente; `/comun/relata` permanece dormente sem as barreiras locais. Production não foi consultado nem alterado nesta branch.

## Achados e decisão

- Fonte canônica nova: `private.comun_relata_reports`/casos do Relata.
- Legado: projeção compatível reversível; nenhum dual-write e nenhum protocolo histórico é reescrito.
- A captura rápida fica atrás de `COMUN_QUICK_CAPTURE_V2` e exige simultaneamente Preview, persistência, evidência, loopback Supabase, chaves sintéticas e service role server-side.
- A taxonomia agora inclui calçada, resíduos, saúde, educação, trabalho e poluição; transporte usa `public_transport`, sem remapeamento para `other`.
- Estado `captured_private` permite recibo imediato com classificação incompleta.
- Foto isolada é conteúdo mínimo válido e permanece `other` até complemento; nenhum texto é inventado como fato.

## Dados e segurança

Migration forward-only `20260804022743_comun_capture_quick_capture_convergence.sql`, checksum `d730d5f005bb7e443b72b016ea30983d0b16123878a9b4b3eb6363991c2e003e`, manifesto local-only (`requiresPromotion=false`, `remotePromotionAllowed=false`). Quatro tabelas novas privadas têm RLS habilitada/forçada e revogação explícita; telemetry é uma RPC pública apenas nominalmente, executável somente por `service_role`, com payload allowlisted e sanitizado.

## Validação

Supabase descartável local: `COMUN_CAPTURE_48_0F_DB_GREEN`; `COMUN_RLS_COMPLETE_GREEN`; `COMUN_EXPLICIT_PRIVILEGE_CONTRACT_OK`. O reset teve conflito transitório de porta/stack compartilhada e foi repetido em portas descartáveis; não é finding do produto. Não houve Supabase remoto, migration remota, Production ou canal externo.

