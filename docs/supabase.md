# Supabase

## Migrations

A migration inicial cria:

- `comun_reports`
- `comun_communities`
- `comun_issues`
- `comun_dossiers`
- `comun_actions`
- view `comun_public_reports`

Execute:

```bash
npm run db:push
```

## RLS

Regras principais:

- visitantes podem inserir relatos;
- visitantes nao leem `comun_reports` diretamente;
- leitura publica usa `comun_public_reports`;
- `raw_text`, `private_contact` e `internal_notes` nao aparecem na view;
- admin usa `SUPABASE_SERVICE_ROLE_KEY` apenas em server actions/pages do servidor.

## Seeds

A migration inclui comunidades e pautas iniciais. `npm run seed` executa `supabase db reset`, entao use com cuidado em ambiente local.

## Storage

Storage fica preparado como decisao arquitetural, mas upload complexo nao entra no MVP para nao atrasar o fluxo relato -> curadoria -> publicacao sanitizada.
