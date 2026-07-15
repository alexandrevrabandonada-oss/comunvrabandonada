# Storage da Arte dos Territórios

Originais JPEG, PNG e WebP, até 30 MB e 80 MP, entram em `archive-private-originals`. A validação server-side confere extensão, MIME, magic bytes, dimensão e animação. O original recebe checksum e nunca ganha URL pública.

Após direito explícito de exibição, Sharp lê o original e gera thumbnail (400 px), card (960 px) e detail (2000 px), em WebP, sem ampliação nem corte destrutivo. Somente essas derivadas são gravadas em `archive-public-derivatives`.

Seleção de provider é server-side por `MEDIA_STORAGE_PROVIDER`: `supabase-local`, `fixture` ou `r2`. O provider R2 não é acionado nesta sprint.
