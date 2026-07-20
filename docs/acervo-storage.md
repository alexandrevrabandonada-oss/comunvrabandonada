# Storage do Acervo

Arte territorial usa os buckets locais `archive-private-originals` e `archive-public-derivatives`; consulte `comun-storage-local.md` para readiness e recuperação do gateway.

Metadados, relações, revisão e permissões ficam no Supabase Postgres. Binários ficam no Cloudflare R2, acessado no servidor pela API S3 e AWS SDK v3.

Áudio original, termo e fonte de transcrição usam `private_original`. Áudio público é arquivo editorial separado em `public_safe`, sem promoção automática do original.

- `R2_BUCKET_ORIGINALS`: somente originais privados, prefixo `originals/`.
- `R2_BUCKET_PUBLIC`: somente versões preparadas para publicação, prefixo `public/`.
- `R2_PUBLIC_BASE_URL`: domínio público do segundo bucket.

Uploads usam URL pré-assinada por no máximo 15 minutos. Leitura de original usa URL temporária por 5 minutos. Segredos R2 não usam prefixo `NEXT_PUBLIC_`.

Tipos aceitos: JPEG, PNG, WebP e PDF. Limites: imagens 25 MB, capas 10 MB e PDF 50 MB. MIME e extensão devem concordar. Áudio e vídeo são recusados.

Configurar CORS no bucket para `PUT` vindo apenas dos domínios administrativos previstos e headers `content-type`; não liberar o bucket de originais para leitura anônima.

# Derivados fotograficos

Originais comunitarios usam `originals/submissions/`. Thumbnails e exibicao usam `public/<item>/<asset>/`, sempre com novas chaves. Checksum SHA-256 detecta duplicidade exata sem reconhecimento visual.
# Verificação descartável

O painel `/comun/admin/acervo/verificacao` valida storage e derivados no runtime de produção sem exportar credenciais. Consulte `docs/acervo-verificacao-producao.md`.
