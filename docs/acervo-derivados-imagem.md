# Derivados de imagem

`generateHistoricalPhotoDerivatives(assetId)` le o original pelo acesso privado, valida a imagem real com Sharp e gera thumbnail WebP ate 480 px e exibicao WebP ate 1600 px.

O processamento corrige orientacao, nao amplia imagens menores e remove EXIF, GPS, XMP e perfis desnecessarios. Cada objeto recebe chave nova, checksum, dimensoes e tamanho. Falhas nao publicam o item e tentam limpar derivados parciais.

Fallback: `ARCHIVE_ASSET_ID=<uuid> npm run generate:photo-derivatives`, somente em ambiente com segredos R2 e Supabase.
