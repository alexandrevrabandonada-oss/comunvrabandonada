# COMUN 48.1B-P1T — postflight

Resultado: `COMUN_P1T_REMOTE_POSTFLIGHT_GREEN`.

Critérios:

- três colunas presentes como `text`, nullable e sem default;
- comentários canônicos;
- RLS e `force_rls` inalterados;
- grants e policies inalterados;
- nenhum acesso público adicional;
- `db lint` sem finding novo além de `comun_sync_public_search_projection` / `comun_search_candidates`.

## Evidência observada

- três colunas presentes como `text`, nullable e sem default;
- comentários canônicos presentes;
- RLS habilitada e `force_rls=false`, igual ao PRE;
- grants de tabela somente para `service_role`, sem grants para `PUBLIC`, `anon` ou `authenticated`;
- nenhuma policy nova observada;
- `supabase migration list --linked` mostra `20260806235454` local e remoto;
- `db lint` mantém apenas o finding preexistente de `public.comun_sync_public_search_projection` referindo `comun_search_candidates`;
- advisors retornaram avisos preexistentes fora do escopo P1T; nenhum objeto ou policy territorial foi apontado.
