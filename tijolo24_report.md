# Tijolo 24 - Publicacao assistida de dossies

Data: 2026-07-08

Ambiente: local-first com banco Supabase linkado/autorizado.  
Deploy: nao executado.  
Checks em producao: nao executados.  
Envio externo: nao executado.

## Implementado

- Migration `20260708141916_dossier_publication_snapshots.sql`.
- Tabela `comun_pauta_dossier_publication_snapshots`.
- Campos `final_publication_checklist` e `final_publication_notes` em `comun_pauta_dossiers`.
- Publicacao assistida criando snapshot imutavel.
- Nova publicacao supersede snapshot ativo anterior.
- Rota publica `/comun/dossies/[slug]` passa a ler snapshot ativo `published` ou `rollback`.
- Edicao posterior do dossie nao altera a pagina publica ate nova publicacao.
- Despublicacao exige motivo e marca snapshot como `unpublished`.
- Rollback cria novo snapshot a partir de snapshot anterior.
- Historico de publicacao no admin do dossie.
- Comparacao entre rascunho atual e snapshot ativo.
- Checklist final persistente antes de publicar.

## Auditoria

Eventos implementados:

- `dossier_publication_snapshot_created`
- `dossier_publication_snapshot_superseded`
- `dossier_unpublished_with_reason`
- `dossier_publication_rollback_created`
- `dossier_publication_final_checklist_saved`
- `dossier_publication_blocked_final_checklist`
- `dossier_publication_diff_viewed`

## Seguranca

- Snapshots guardam apenas titulo, resumo, corpo e slug publicos.
- Rota publica nao consulta notas internas, responsaveis, checklists, e-mails de equipe ou campos operacionais.
- `response_text` completo, `raw_text`, `private_contact`, `internal_notes`, signed URL e `storage_path` seguem fora da rota publica.
- Tabela de snapshots tem RLS habilitado e acesso concedido apenas a `service_role`.

## Pendencias

- Nenhum deploy executado por regra local-first.
- Validacao visual autenticada da tela admin fica para uso manual com sessao admin.

## Proximo tijolo recomendado

Tijolo 25: preparar publicacao publica assistida de dossies com pagina de historico publico limitado ou changelog seguro, mantendo snapshots e rollback como base.

## Fechamento R1

Data: 2026-07-08

- Documentacao corrigida para usar a regra atual: revisores reais distintos vinculados a perfis administrativos.
- Confirmada consistencia com Tijolos 22/23: publicacao exige identidade/perfil, nao apenas nomes diferentes.
- Confirmada implementacao real de snapshots, supersede, despublicacao com motivo, rollback, historico admin e comparacao rascunho x snapshot.
- Aceite local executado com `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- Deploy nao executado.
- Checks em producao nao executados.
