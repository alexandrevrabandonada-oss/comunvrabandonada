# Estado COMUN — Sprint 20.1: ativacao R2

Data: 2026-07-14  
Status: **R2 ativado, validado e publicado em producao**

## Entregue

- adapter R2 com upload assinado, leitura privada temporaria, escrita, copia, `HEAD`, listagem e exclusao;
- separacao entre originais privados e derivados publicos;
- validacao de MIME, extensao, tamanho, prefixo e confirmacao do objeto real apos o `PUT`;
- rate limit de 20 URLs por administrador a cada 10 minutos, com falha fechada;
- painel administrativo de storage com uso estimado e healthcheck auditavel;
- smoke R2 real protegido por opt-in, com cleanup e verificacao de ausencia final;
- auditoria de orfaos em dry-run, com exclusao em duas etapas e chaves somente por hash;
- imagens publicas com `next/image`, origem R2 condicional e CSP report-only;
- documentacao operacional, CORS, CSP e checklist de deploy.

## Evidencias

| Gate                           | Resultado                                                                  |
| ------------------------------ | -------------------------------------------------------------------------- |
| lint, TypeScript e build local | passaram com Next.js 16.2.10                                               |
| matriz RLS                     | `RLS_MATRIX_OK`                                                            |
| lint local do Supabase         | nenhuma falha                                                              |
| smoke da fundacao do acervo    | passou                                                                     |
| smoke R2 real                  | passou: escrita privada, `HEAD`, leitura assinada, copia publica e cleanup |
| deploy Vercel Production       | passou com Next.js 16.2.10                                                 |
| smokes HTTP de producao        | passaram: nao vazamento e 11 rotas publicas                                |
| auditoria de dependencias      | nenhuma vulnerabilidade alta; dois avisos moderados transitivos            |

O `npm ci` encontrou um arquivo em uso no Windows (`EPERM`). `npm install` restaurou as dependencias e todos os gates posteriores passaram. Nao foi aplicado `npm audit fix --force`, pois a sugestao faria downgrade destrutivo para Next.js 9.3.3.

## Ativacao externa concluida

- assinatura R2 ativada pelo responsavel da conta;
- bucket de originais criado e mantido sem acesso publico;
- bucket de derivados criado com URL publica de desenvolvimento;
- CORS configurado para o dominio estavel de producao e localhost;
- token S3 final limitado a leitura e escrita de objetos somente nos dois buckets;
- sete variaveis `R2_*` instaladas como segredos em Production e no Preview da branch;
- deploy promovido e alias estavel `https://comunvrabandonada.vercel.app` atualizado.

Uma credencial intermediaria que apareceu durante a inspecao tecnica foi revogada imediatamente e nunca foi instalada. A credencial final nao foi exibida nem persistida no repositorio; o arquivo temporario usado para configurar os ambientes foi removido apos os testes.

## Auditoria de objetos

O dry-run real encontrou zero objetos no storage, zero objetos orfaos e cinco registros historicos no banco sem objeto correspondente. Nada foi excluido. O detalhe esta em `reports/r2-orphans-2026-07-14.json`, com chaves representadas apenas por hash SHA-256.

## Pendencia operacional

A URL `r2.dev` atende ao smoke e esta ativa, mas a Cloudflare a classifica como limitada e nao recomendada para carga de producao. Quando houver um dominio gerenciado na conta, vincular um subdominio ao bucket publico e substituir `R2_PUBLIC_BASE_URL` na Vercel. O bucket de originais deve permanecer privado.

Nenhum segredo ou URL assinada foi incluido neste relatorio.
