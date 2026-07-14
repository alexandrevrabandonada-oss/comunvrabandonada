# Tijolo 20 - Responsaveis e prazos na fila de revisoes

## Ambiente

- Ambiente usado: local.
- Deploy executado: nao.
- Check em producao executado: nao.
- Local-only: sim.

## Implementado

- Migration `supabase/migrations/20260708024032_pauta_dossier_review_ops.sql`.
- Campos operacionais em `comun_pauta_dossiers`:
  - `factual_reviewer_assigned`;
  - `editorial_reviewer_assigned`;
  - `review_priority`;
  - `review_due_at`;
  - `review_notes_internal`.
- Fila `/comun/admin/dossies/revisoes` com:
  - filtro por responsavel;
  - filtro por prioridade;
  - filtro por vencidos;
  - indicadores `Vence hoje` e `Vencidos`;
  - ordenacao por vencido, vence hoje, prioridade e prazo.
- Pagina `/comun/admin/dossies/[id]` com bloco `Operacao da revisao` para atribuir responsaveis, prioridade, prazo e nota operacional interna.
- Action admin `updatePautaDossierReviewOpsAction`.
- Auditoria:
  - `reviewer_assigned`;
  - `review_due_date_changed`;
  - `review_priority_changed`;
  - `review_overdue_seen`.
- Smoke novo:
  - `scripts/smoke-comun-pauta-dossier-review-ops.mjs`;
  - comando `npm run smoke:pauta-dossier-review-ops`.

## Verificacao

Fechamento realizado no R1:

- migration aplicada no banco Supabase linkado/autorizado via CLI;
- schema confirmado;
- `npm run smoke:pauta-dossier-review-queue` passou contra `http://localhost:3000`;
- `npm run smoke:pauta-dossier-review-ops` passou contra `http://localhost:3000`.

Nao foi aplicado deploy nem executado smoke contra producao.

## Status final

Aceito.
