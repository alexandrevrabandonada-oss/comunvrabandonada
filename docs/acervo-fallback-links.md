# Fallback controlado de links musicais

`HEAD` permanece o padrão. `GET_HEADERS_ONLY` só é permitido para plataforma listada em `MUSIC_LINK_GET_FALLBACK_PLATFORMS` e diante de 403, 405 ou falha HEAD compatível.

Cada destino e redirect passa por HTTPS, allowlist, resolução DNS renovada e bloqueio de localhost, redes privadas/link-local e hostnames suspeitos. Há timeout curto e no máximo três redirects. O corpo é cancelado imediatamente, tipos de mídia são bloqueados e nenhum corpo, cookie, token, query sensível ou IP resolvido é armazenado.
