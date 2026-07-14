# Tijolo 25 - Auditoria de seguranca

Data: 2026-07-08

Ambiente: local-first.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Garantias mantidas

- A rota publica de dossie continua lendo apenas snapshot ativo `published` ou `rollback`.
- Snapshot publico exposto contem apenas campos publicos: titulo, resumo, corpo, slug, nota publica de mudanca, rotulo e datas publicas.
- Estado despublicado retorna fluxo seguro sem revelar dossie interno, motivo ou historico.
- Estado rollback nao usa a palavra rollback publicamente.
- Changelog publico nao mostra motivo interno, revisor, e-mail, perfil, checklist, auditoria, divergencia editorial ou responsavel interno.

## Confirmado por smoke

- Ausencia de `internal_notes`.
- Ausencia de `review_notes_internal`.
- Ausencia de `private_contact`.
- Ausencia de `raw_text`.
- Ausencia de `response_text`.
- Ausencia de `storage_path`.
- Ausencia de `signed_url`.
- Ausencia de checklist/auditoria/perfis internos.

## Observacao

O campo `public_change_note` e sanitizado na acao admin para reduzir risco de termos internos em resumo publico.
