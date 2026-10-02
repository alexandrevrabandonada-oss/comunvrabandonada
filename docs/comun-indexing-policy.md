# Indexação durante a preparação do COMUN

Estado: `pilot_noindex`. O domínio oferece exploração e módulos autorizados de
piloto; o lançamento integral continua separado pelo gate `launch_publicly`.

- As páginas herdam `robots: noindex` e as respostas recebem
  `X-Robots-Tag: noindex, noarchive`, inclusive arquivos servidos pelo app.
- `robots.txt` permite alcançar páginas públicas para ler o `noindex` e exclui
  APIs, administração, preview, conta, Caixa, participação pessoal e acesso.
- `sitemap.xml` contém um `urlset` XML vazio. Isso resolve a rota ausente sem
  submeter URLs antes da decisão de lançamento.
- O domínio canônico é `https://comunsocial.online`; nenhum host de Preview,
  parâmetro de busca, ID pessoal ou URL administrativa entra no sitemap.
- Nenhuma flag ativa indexação automaticamente. A futura entrega de lançamento
  precisa reconciliar a autorização existente, a allowlist de conteúdo realmente
  publicável, as exclusões e os metadados antes de alterar esta política.

Robots e noindex orientam buscadores; não substituem autenticação, RLS ou
proteção de dados. Rotas privadas continuam protegidas no servidor.

## Evidência técnica

O auditor valida status, Content-Type e corpo dos três assets: manifest JSON,
diretivas exatas do robots e XML vazio válido do sitemap. HTML com HTTP 200 não
satisfaz nenhum deles. Uma regra Allow específica, um grupo extra de crawler,
um sitemap externo ou XML com URLs é rejeitado no contrato de piloto.

O artifact registra `publicAssetContracts`, `indexingPolicy` e
`pilotNoindexConfirmed`, sem copiar corpos, queries ou URLs privadas.
`launch_indexing:pilot_noindex` permanece finding de preparação; os assets
presentes não tornam o produto pronto para lançamento.

Referências: [Next.js robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots),
[Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap),
[Google: noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

Limite desta rodada: a heurística antiga de substrings no HTML e a verificação
de proveniência de conteúdo continuam exigindo reconciliação própria. A
validação dos assets não declara essas lacunas encerradas.
