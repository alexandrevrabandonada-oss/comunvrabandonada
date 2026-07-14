# Storage do Acervo

Metadados, relações, revisão e permissões ficam no Supabase Postgres. Binários ficam no Cloudflare R2, acessado no servidor pela API S3 e AWS SDK v3.

- `R2_BUCKET_ORIGINALS`: somente originais privados, prefixo `originals/`.
- `R2_BUCKET_PUBLIC`: somente versões preparadas para publicação, prefixo `public/`.
- `R2_PUBLIC_BASE_URL`: domínio público do segundo bucket.

Uploads usam URL pré-assinada por no máximo 15 minutos. Leitura de original usa URL temporária por 5 minutos. Segredos R2 não usam prefixo `NEXT_PUBLIC_`.

Tipos aceitos: JPEG, PNG, WebP e PDF. Limites: imagens 25 MB, capas 10 MB e PDF 50 MB. MIME e extensão devem concordar. Áudio e vídeo são recusados.

Configurar CORS no bucket para `PUT` vindo apenas dos domínios administrativos previstos e headers `content-type`; não liberar o bucket de originais para leitura anônima.
