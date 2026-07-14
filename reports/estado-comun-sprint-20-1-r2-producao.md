# Estado COMUN — Sprint 20.1: ativacao R2

Data: 2026-07-14  
Status: **implementacao local concluida; ativacao externa bloqueada por configuracao ausente**

## Entregue

- adapter R2 com upload assinado, leitura privada temporaria, escrita, copia, `HEAD`, listagem e exclusao;
- separacao entre originais privados e derivados publicos;
- validacao de MIME, extensao, tamanho, prefixo e confirmacao do objeto real apos o `PUT`;
- rate limit de 20 URLs por administrador a cada 10 minutos, com falha fechada;
- painel administrativo `/comun/admin/acervo/storage` com configuracao, uso estimado e healthcheck auditavel;
- smoke R2 real protegido por `RUN_REAL_R2_SMOKE=true`, com cleanup e verificacao de ausencia final;
- auditoria de orfaos em dry-run por padrao, com exclusao em duas etapas e chaves registradas somente por hash;
- imagens publicas migradas para `next/image`, origem R2 condicional e CSP report-only;
- documentacao operacional, CORS, CSP e checklist de deploy.

## Evidencias locais

| Gate                               | Resultado                                                     |
| ---------------------------------- | ------------------------------------------------------------- |
| `npm run lint`                     | passou                                                        |
| `npm run typecheck`                | passou                                                        |
| `npm run build`                    | passou com Next.js 16.2.10                                    |
| `npm run audit:rls-matrix`         | `RLS_MATRIX_OK`                                               |
| `npx supabase db lint --local`     | nenhuma falha                                                 |
| `npm run smoke:archive-foundation` | passou; R2 real explicitamente ignorado                       |
| `npm run smoke:r2-real` sem flag   | recusou executar, como projetado                              |
| smoke R2 com flag                  | bloqueado pelas sete variaveis ausentes                       |
| `npm audit --audit-level=high`     | passou; restam 2 avisos moderados transitivos do Next/PostCSS |

O `npm ci` foi tentado, mas o Windows recusou remover um diretorio em uso (`EPERM`). `npm install` restaurou as dependencias e os gates posteriores passaram. Nao foi aplicado `npm audit fix --force`, pois a sugestao faria downgrade destrutivo para Next.js 9.3.3.

## Estado externo verificado

A sessao da CLI Vercel esta ativa. O projeto possui as variaveis Supabase e de site existentes, mas nenhuma das sete variaveis `R2_*`. Por isso nao foram executados deploy, healthcheck remoto, upload real, smoke de preview/producao nem auditoria real de orfaos. Nenhum bucket ou CORS foi criado sem credenciais Cloudflare.

## Para concluir a ativacao

1. criar ou informar os dois buckets e um token S3 limitado;
2. configurar CORS e dominio apenas no bucket publico;
3. adicionar as sete variaveis `R2_*` no local, Preview e Production;
4. executar healthcheck e smoke real, confirmando cleanup;
5. publicar Preview, validar login/editor/upload/publicacao/despublicacao e promover para Production;
6. executar smokes HTTP de producao e a auditoria de orfaos em dry-run.

Nenhum segredo, URL assinada, nome real de bucket ou chave privada de objeto foi incluído neste relatorio.
