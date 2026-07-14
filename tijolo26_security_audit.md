# Tijolo 26 - Auditoria de seguranca

Data: 2026-07-08

Ambiente: local-first.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Garantias

- `/comun/dossies` lista apenas snapshots ativos `published` e `rollback`.
- `rollback` aparece publicamente apenas por meio do rotulo seguro de versao.
- Dossies `draft`, `editorial_review`, `changes_requested`, `approved` sem snapshot, `unpublished`, `archived` e snapshots `superseded` nao aparecem.
- Busca usa somente titulo, resumo, corpo publico e pauta publica.
- Filtros usam apenas pauta, comunidade e categoria publicas.

## Nao exposto

- autor interno;
- revisor;
- responsavel;
- motivo de despublicacao;
- motivo de rollback;
- checklist;
- auditoria;
- status interno;
- nomes de tabelas;
- e-mails;
- perfis/papeis admin;
- `storage_path`;
- signed URL.

## Confirmado por smoke

O smoke `smoke:public-dossier-index` confirmou exclusao de dossies sem snapshot, snapshots `superseded`, snapshots `unpublished` e ausencia de campos internos na listagem.
