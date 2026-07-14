# Tijolo 20 - Security audit

## Ambiente

- Ambiente usado: local.
- Deploy executado: nao.
- Check em producao executado: nao.
- Local-only: sim.

## Escopo privado

Os novos campos operacionais sao internos:

- `factual_reviewer_assigned`;
- `editorial_reviewer_assigned`;
- `review_priority`;
- `review_due_at`;
- `review_notes_internal`.

## Controles

- A edicao dos campos fica em `/comun/admin/dossies/[id]`, protegida por `requireComunAdmin`.
- A fila `/comun/admin/dossies/revisoes` segue admin-only.
- A rota publica de dossie nao foi alterada.
- `review_notes_internal` nao e renderizado em rota publica.
- Auditoria registra mudancas sem gravar a nota interna completa em metadata.
- O smoke novo tem guard local-first e aborta se `NEXT_PUBLIC_SITE_URL` apontar para producao sem `ALLOW_PRODUCTION_CHECKS=1`.

## Estado da verificacao de vazamento

A verificacao automatizada de nao vazamento passou no R1. O smoke confirmou que responsaveis, prioridade, prazo, nomes de campos operacionais e nota interna nao aparecem na rota publica.

## Risco restante

Sem risco restante identificado no escopo do Tijolo 20. Deploy nao foi executado.
