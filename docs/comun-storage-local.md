# Storage local do COMUN

Use a stack Supabase local com `DO_NOT_TRACK=1`. Os buckets `archive-private-originals` e `archive-public-derivatives` são reproduzidos por `config.toml` e migration.

Depois de start/reset, execute `npm run wait:storage:local`. Se houver 502 persistente e os logs do Kong apontarem para o IP anterior do Storage, reinicie somente o container Kong desta instância e repita o readiness. Nunca edite tabelas ou funções oficiais de `storage` para mascarar a falha.

O provider `supabase-local` recusa qualquer URL que não seja localhost. Sobrescreva as variáveis do processo; não use o `.env.local` remoto nos gates.
