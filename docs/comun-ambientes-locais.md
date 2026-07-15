# Ambientes locais do COMUN

Os comandos `local:env:check` e `local:env:print-safe` obtêm a configuração diretamente de `supabase status`. Segredos ficam somente no processo e nunca são impressos ou gravados. `local:radio:start` e `local:radio:test` iniciam filhos com localhost, `DO_NOT_TRACK=1` e provider `supabase-local`.

O `.env.local` existente não é alterado. `.env.comun.local` já é coberto pelo ignore de `.env.*`, mas os scripts são o caminho preferido. Qualquer destino Vercel, R2 ou Cloudflare encerra o comando antes de escrita.
