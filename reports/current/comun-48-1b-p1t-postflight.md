# COMUN 48.1B-P1T — postflight

Pendente até a promoção remota controlada.

Critérios:

- três colunas presentes como `text`, nullable e sem default;
- comentários canônicos;
- RLS e `force_rls` inalterados;
- grants e policies inalterados;
- nenhum acesso público adicional;
- `db lint` sem finding novo além de `comun_sync_public_search_projection` / `comun_search_candidates`.
