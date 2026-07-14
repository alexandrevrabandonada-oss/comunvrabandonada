# Tijolo 24 - Auditoria de seguranca

Data: 2026-07-08

Ambiente: local-first.  
Deploy: nao executado.  
Checks em producao: nao executados.

## Confirmacoes

- A rota publica de dossies usa snapshots ativos e nao o rascunho admin.
- Snapshot publico contem somente `public_title`, `public_summary`, `public_body` e `public_slug`.
- Checklist final e notas finais ficam no dossie admin e nao sao renderizados publicamente.
- Historico de publicacao, motivo de despublicacao e rollback ficam admin-only.
- Rota publica nao renderiza responsaveis, e-mails, papeis admin ou notas operacionais.
- Smokes confirmaram ausencia de `internal_notes`, `review_notes_internal`, signed URL, `storage_path` e segredos ficticios.

## Banco

- `comun_pauta_dossier_publication_snapshots` tem RLS habilitado.
- `anon` e `authenticated` nao receberam grants diretos.
- `service_role` recebeu acesso para leitura/escrita server-side.

## Riscos restantes

- A tela admin autenticada ainda deve ser revisada visualmente por operador humano antes de release.
- Fluxos antigos de dossie publicados diretamente por tabela nao aparecem publicamente ate terem snapshot, por desenho de seguranca.

## Fechamento R1

- Documentacao e mensagem de erro atualizadas para exigir revisores reais distintos vinculados a perfis administrativos.
- Smokes locais em `http://localhost:3000` confirmaram que campos internos, perfis, e-mails, notas operacionais e segredos ficticios nao aparecem publicamente.
- Nao houve deploy.
- Nao houve smoke contra producao.
