# Tijolo 29 - Smoke

Data: 2026-07-08
Ambiente: local

## Smoke novo

`npm run smoke:rls-hardening`

Cobertura:

- confirma que `service_role` acessa `comun_official_protocols` server-side;
- confirma que `anon` nao tem acesso direto;
- confirma que `authenticated` nao tem acesso direto usando JWT local com role `authenticated`;
- cria relato e protocolo oficial com `response_text`, `internal_notes`, `raw_text` e contato privado;
- confirma que a rota publica de acompanhamento continua funcionando;
- confirma que `response_text`, `raw_text`, `private_contact`, `internal_notes`, storage path e signed URL nao aparecem publicamente;
- confirma que admin/server-side ainda acessa dados completos via `service_role`;
- limpa dados de teste.

Resultado:

`RLS_HARDENING_SMOKE_OK`

## Smokes de regressao

- `smoke:official-protocol` - passou
- `smoke:official-protocols-admin` - passou
- `smoke:official-protocols-metrics` - passou
- `smoke:no-leak-http` - passou
