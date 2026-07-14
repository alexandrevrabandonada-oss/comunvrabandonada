# Estado COMUN Sprint 20 — fundação do portal e acervo vivo

Data: 2026-07-14

## Arquitetura e storage

Metadados, relações, revisão, direitos e status ficam no Supabase Postgres. Arquivos usam Cloudflare R2 por uma abstração `MediaStorageProvider`, inicialmente implementada por `R2MediaStorageProvider` com AWS SDK v3/S3. Os buckets `R2_BUCKET_ORIGINALS` e `R2_BUCKET_PUBLIC` separam originais privados de versões públicas. Vercel hospeda somente a aplicação.

URLs de upload expiram em até 15 minutos e leitura privada em 5 minutos. O provider cobre upload, leitura privada, put, delete, copy, existência e metadata. JPEG/PNG/WebP aceitam até 25 MB, capas até 10 MB e PDF até 50 MB. Áudio e vídeo são bloqueados.

## Modelagem e segurança

A migration `20260714144416_archive_foundation.sql` cria itens, assets, coleções, vínculos e relações. Todas as tabelas têm RLS. Público lê somente item publicado/visível, asset `public_safe + approved`, coleção publicada e relações entre itens públicos. Escrita passa pelo servidor com `service_role`.

Seleções públicas excluem `editorial_notes`, `permission_reference`, `internal_note` e `object_key`. Originais nunca recebem URL pública. Auditoria sanitizada registra criação/edição, uploads, revisão, publicação/despublicação/arquivo e coleções.

## Rotas e navegação

Criadas `/comun/acervo`, `/comun/acervo/[slug]`, `/comun/acervo/colecoes`, `/comun/acervo/colecoes/[slug]`, `/comun/admin/acervo`, `/comun/admin/acervo/novo`, `/comun/admin/acervo/[id]` e `/comun/admin/acervo/colecoes`.

A navegação pública principal agora contém Início, Pautas, Acervo e Dossiês, com Relatar preservado como CTA destacado e fixo no mobile. A home ganhou somente “Memória viva da cidade”, limitada a fotografia, coleção e artista.

## Workflow, direitos, artistas e busca

O admin cadastra metadados, fonte, direitos, créditos, local/data, original privado, versão pública, revisão de asset, workflow e coleção. Publicação exige fonte, créditos, direitos não restritos/desconhecidos, asset público aprovado e alt text de imagens.

Artistas suportam biografia, gênero, integrantes, discografia textual, capa e links oficiais. `music_release` exige `external_link_only`; não há hospedagem de áudio.

A busca server-side cobre título, resumo, descrição, cidade, bairro, local, fonte, créditos e data aproximada. Filtros de tipo, cidade, bairro e período ficam na query string.

## Backup e custos

`scripts/export-comun-archive-manifest.mjs` exporta o manifest diário sem baixar binários. `backups/` está ignorado pelo Git. A documentação recomenda manifest semanal, sincronização periódica de ambos os buckets e cópia externa independente.

Custos esperados: Postgres permanece focado em metadados leves; R2 concentra armazenamento/operações e eventual egress conforme domínio/configuração; Vercel processa páginas e URLs assinadas, sem transportar upload pelo runtime.

## Verificação e deploy

- lint: passou com dois avisos de `<img>` remoto;
- typecheck: passou;
- build: passou, 33 páginas e todas as rotas do Acervo reconhecidas;
- migration remota: aplicada, junto às migrations anteriores pendentes;
- `smoke:archive-foundation`: passou localmente;
- `smoke:pauta-dossier-publication`: passou localmente;
- `smoke:no-leak-http`: passou localmente;
- `smoke:public-ui`: encontrou expectativas legadas de texto em `/comun/dossies`, fora do Acervo;
- manifest de backup: exportado com sucesso.

Deploy Vercel e smoke em produção não executados porque as sete variáveis R2 e os buckets/CORS ainda não estão configurados no ambiente local/produção.

## Riscos restantes e próximo tijolo

1. Configurar buckets, CORS, domínio público e credenciais R2 server-only.
2. Fazer smoke real de upload/cópia/exclusão no R2; o smoke atual cobre banco, HTTP, workflow e bloqueio de áudio.
3. Corrigir as expectativas legadas do `smoke:public-ui` para o texto atual de Dossiês.
4. Trocar `<img>` por estratégia otimizada após definir o domínio público R2 em `next.config`.
5. Evoluir relações com pautas/dossiês para chaves tipadas, pois o modelo solicitado usa relações item-a-item.

Próximo tijolo recomendado: configurar e validar R2 ponta a ponta, criar derivação segura de thumbnails e adicionar revisão estruturada de direitos com histórico por decisão.

## Atualização de consolidação — 2026-07-14

O estado do Sprint 20 foi consolidado com as evoluções editoriais anteriores e a auditoria técnica posterior. A aplicação agora compila em Next.js 16.2.10 e React 19.2.7, usa ESLint 9, `proxy.ts` e APIs assíncronas de request. Os smokes de Acervo, publicação de dossiês, autenticação administrativa, não vazamento e interface pública passaram após a atualização.

As migrations locais até `20260714144416_archive_foundation.sql` estão aplicadas no Supabase remoto. O commit de integração inclui código, migrations, scripts, documentação e relatórios acumulados; credenciais locais, backups e logs permanecem fora do Git.
