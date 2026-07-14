# Tijolo 29 - Auditoria de seguranca

Data: 2026-07-08
Ambiente: local

## Tabela corrigida

`public.comun_official_protocols`

Antes:

- RLS desabilitado;
- grants diretos amplos para `anon`;
- grants diretos amplos para `authenticated`;
- Advisor Supabase marcava risco critico.

Depois:

- RLS habilitado;
- `anon` sem acesso direto;
- `authenticated` sem acesso direto;
- `service_role` com acesso server-side;
- `npx supabase db lint --local` sem erros.

## Dados sensiveis protegidos

A tabela contem ou referencia:

- numero oficial;
- canal/agencia;
- status;
- resposta oficial completa (`response_text`);
- resumo publico (`public_summary`);
- datas;
- relacao com relato;
- notas internas (`internal_notes`).

O smoke confirmou que a rota publica nao exibe:

- `response_text`;
- `raw_text`;
- `private_contact`;
- `internal_notes`;
- storage path;
- signed URL;
- campos internos nominais.

## Modelo preservado

Rotas publicas seguem recebendo dados sanitizados via servidor. Admin e operacao continuam usando `service_role`, sem abrir a tabela diretamente para clientes publicos.
