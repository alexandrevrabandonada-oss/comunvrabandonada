# Cloudflare R2 do Acervo Vivo

O acervo usa dois buckets separados: `R2_BUCKET_ORIGINALS` para originais privados e `R2_BUCKET_PUBLIC` para derivados aprovados. A aplicacao nunca envia credenciais R2 ao navegador: uploads e leituras privadas usam URLs assinadas curtas, emitidas pelo servidor.

## Configuracao

1. Crie os dois buckets na mesma conta Cloudflare.
2. Crie um token S3 limitado a esses buckets, com leitura e gravacao.
3. Configure as sete variaveis `R2_*` listadas em `.env.example` no ambiente local e na Vercel.
4. Vincule somente o bucket publico a um dominio proprio e informe-o em `R2_PUBLIC_BASE_URL`. Nao publique o bucket de originais.
5. Configure CORS em ambos os buckets para os dominios reais da aplicacao e, durante desenvolvimento, `http://localhost:3000`:

```json
[
  {
    "AllowedOrigins": ["https://SEU-DOMINIO", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Restrinja origens antes de producao. URLs assinadas sao credenciais temporarias: nao devem aparecer em logs, auditorias ou relatorios.

## Validacao

- Acesse `/comun/admin/acervo/storage` como administrador e execute o healthcheck. Ele grava, le, verifica e remove fixtures nos dois buckets.
- Execute `RUN_REAL_R2_SMOKE=true npm run smoke:r2-real`. Sem a flag, o teste real recusa executar.
- Execute `npm run audit:r2-orphans` em modo dry-run. Exclusao exige ainda `R2_ORPHAN_DELETE_CONFIRM=true`.

O relatorio de orfaos registra apenas hash SHA-256 e prefixo das chaves, nunca a chave privada completa.
