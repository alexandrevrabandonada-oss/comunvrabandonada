# Tijolo 20-R1 - Security audit

## Ambiente

- Ambiente usado: local para app e smokes HTTP.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.

## Campos internos protegidos

O smoke confirmou que os seguintes valores/campos nao aparecem na rota publica do dossie:

- responsavel factual;
- responsavel editorial;
- `review_priority`;
- `review_due_at`;
- `review_notes_internal`;
- `factual_reviewer_assigned`;
- `editorial_reviewer_assigned`;
- nota operacional interna usada como segredo de teste.

## Rotas

- Edicao operacional: `/comun/admin/dossies/[id]`, admin-only.
- Fila operacional: `/comun/admin/dossies/revisoes`, admin-only.
- Rota publica de dossie: inalterada quanto a campos operacionais.

## Auditoria

A action admin registra:

- `reviewer_assigned`;
- `review_due_date_changed`;
- `review_priority_changed`;
- `review_overdue_seen`.

## Conclusao

Sem vazamento publico detectado no smoke automatizado. Campos operacionais permanecem restritos ao admin.
