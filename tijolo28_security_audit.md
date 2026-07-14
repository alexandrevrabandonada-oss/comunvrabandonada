# Tijolo 28 - Auditoria de seguranca

Data: 2026-07-08
Ambiente: local

## Garantias de implementacao

- Destaques referenciam `snapshot_id`, nao dossie rascunho.
- Leitura publica filtra snapshots ativos `published` e `rollback`.
- Snapshots `superseded`, `unpublished`, inexistentes ou despublicados sao descartados.
- Tabela nova tem RLS habilitado e nao recebeu policy publica.
- Admin de destaque exige perfil ativo com papel `admin`, `editor` ou `publisher`.
- Rota publica nao consulta nem renderiza revisores, responsaveis, e-mails, papeis admin, checklist, auditoria, motivos internos ou notas internas.

## Campos proibidos cobertos pelo smoke novo

- `internal_notes`;
- `review_notes_internal`;
- `unpublish_reason`;
- motivo interno;
- responsavel/revisor;
- `comun_admin_profiles`;
- e-mails;
- `storage_path`;
- `signed_url`;
- `private_contact`;
- `raw_text`;
- `response_text`;
- `checklist`;
- auditoria.

## Limite de verificacao

O smoke novo ainda nao passou porque a migration da tabela nova nao foi aplicada no banco local/autorizado disponivel para os smokes.
