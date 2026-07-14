# Tijolo 21 - Security audit

## Ambiente

- Ambiente usado: local.
- Banco usado: Supabase linkado/autorizado via CLI.
- Deploy executado: nao.
- Check em producao executado: nao.
- Envio externo executado: nao.

## Banco

Tabela `comun_admin_notifications`:

- RLS habilitado;
- `anon` sem acesso;
- `authenticated` sem acesso;
- `service_role` com acesso;
- sem policies publicas.

## Dados

As notificacoes gravam apenas resumo operacional seguro:

- tipo;
- alvo administrativo;
- titulo;
- corpo curto;
- prioridade;
- responsavel;
- status.

Nao gravam:

- `raw_text`;
- contato privado;
- resposta oficial completa;
- nota interna completa;
- signed URL;
- storage path.

## Rotas

- `/comun/admin/notificacoes`: admin-only.
- `/comun/admin/dossies/revisoes`: admin-only e digest interno.
- Rotas publicas de dossie nao foram alteradas para exibir notificacoes.

## Smoke de seguranca

O smoke confirmou que a rota publica do dossie nao contem:

- segredo de teste;
- responsavel interno;
- nome da tabela de notificacoes;
- kinds internas;
- titulos de notificacao interna.

## Conclusao

Sem vazamento publico detectado no escopo do Tijolo 21.
