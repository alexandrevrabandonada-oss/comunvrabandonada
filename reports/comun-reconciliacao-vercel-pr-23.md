# Reconciliação Vercel da PR #23

Data: 21 de julho de 2026
Escopo: comparação somente leitura. Nenhum domínio, variável, deployment ou projeto foi alterado.

## Decisão arquitetural

O candidato canônico é **`comunvrabandonada`** porque é o projeto conectado ao repositório GitHub, recebe automaticamente a PR #23 e produz a `main` como target de produção. O projeto **`comun-social`** deve permanecer temporariamente como origem do domínio e como rollback até a troca explicitamente autorizada.

Não mover o domínio antes de concluir a equivalência das variáveis, validar o preview contra o banco migrado e registrar um deployment de rollback funcional.

## Comparação dos projetos

| Configuração | `comunvrabandonada` — candidato canônico | `comun-social` — projeto antigo |
|---|---|---|
| Project ID | `prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X` | `prj_cussCItqOwJYJ3ELKyKr6M35KrJj` |
| Repositório | GitHub `alexandrevrabandonada-oss/comunvrabandonada`, repo ID `1232408732` | Nenhum vínculo Git comprovado; deployment atual tem origem `cli` |
| Branch de produção | `main` | Não aplicável ao deployment atual; publicação manual via CLI |
| Framework | Next.js | Next.js |
| Node.js | `24.x` | `24.x` |
| Diretório raiz | `.` | `.` |
| Build command | padrão Next.js: `npm run build` ou `next build` | padrão Next.js: `npm run build` ou `next build` |
| Install command | padrão autodetectado do gerenciador | padrão autodetectado do gerenciador |
| Output | padrão Next.js | padrão Next.js |
| Proteção | `all_except_custom_domains`; um bypass de automação cadastrado | `all_except_custom_domains`; um bypass de automação cadastrado |
| Cron Vercel | habilitação registrada, mas `definitions: []` | habilitação registrada, mas `definitions: []` |
| Integrações | nenhuma integração de projeto foi exposta pela resposta de configuração; confirmar no painel antes da troca | nenhuma integração de projeto foi exposta pela resposta de configuração; confirmar no painel antes da troca |

## Deployments e commits

### Projeto canônico

- Preview da PR #23: `dpl_GvvVBwntQD8LvJZZhhnrafrYfd9F`.
- URL: `https://comunvrabandonada-ckvidoam3-alexandrevrabandonada-oss-projects.vercel.app`.
- Origem: GitHub, branch `codex/sprint-40-1-mobile-preview`.
- Commit: `0085178ec921030a96a4b4b64b8a6c1dc26ff916`.
- Estado: `READY`; build concluído sem erro.
- Produção atual: `dpl_GnYtHEwaQvvwSgdZjvPufw2XFYuk`.
- URL: `https://comunvrabandonada-ce72d4vig-alexandrevrabandonada-oss-projects.vercel.app`.
- Origem: GitHub, branch `main`.
- Commit: `a599d124a84c5542ec3a56052276024b9bd4854a`.
- Estado: `READY`.

### Projeto antigo

- Produção atual: `dpl_3PWgyGVUUyPBrdjdwR9kVfe5YLkG`.
- URL: `https://comun-social-9vm9axr4r-alexandrevrabandonada-oss-projects.vercel.app`.
- Origem: `cli`; sem Git source no deployment.
- Commit informado na implantação: `dc0a3a54f5d2589fd1365a09b9fbed585452668a`, `feat: consolida arte dos territorios no acervo (#21)`.
- Estado: `READY`.

## Domínios e aliases

### `comunvrabandonada`

- domínio de projeto verificado: `comunvrabandonada.vercel.app`;
- aliases observados no preview/produção incluem URLs geradas `comunvrabandonada-*.vercel.app`;
- `comunsocial.online` e `www.comunsocial.online` não estão anexados.

### `comun-social`

- `comun-social.vercel.app`;
- `comunsocial.online`, verificado e sem redirect;
- `www.comunsocial.online`, verificado, redirect HTTP 308 para `comunsocial.online`;
- aliases do deployment incluem os dois domínios públicos.

O DNS é administrado por nameservers da Hostinger. A inspeção da Vercel indica edge ativo, mas nameservers diferentes dos sugeridos pela Vercel. A troca deve preservar os registros atuais e ser feita por transferência de domínio entre projetos Vercel, não por alteração improvisada de DNS.

## Matriz de variáveis

Valores não foram impressos ou copiados. Variáveis cifradas/sensíveis não podem ser comparadas semanticamente pela resposta da API; nesses casos a classificação correta é **requer decisão**, mesmo quando o nome existe nos dois projetos.

| Variável | Classificação | Observação de escopo/decisão |
|---|---|---|
| `COMUN_ADMIN_PASSWORD` | presente apenas no projeto antigo | Não copiar automaticamente. Confirmar se é legado; preferir o modelo administrativo atual. |
| `MEDIA_STORAGE_PROVIDER` | presente apenas no projeto antigo | Decidir se produção canônica deve usar Supabase ou R2 conforme contrato vigente. |
| `COMUN_LOOKUP_HASH_SALT` | presente apenas no canônico | Produção canônica; preservar. |
| `CRON_SECRET` | requer decisão | Existe em produção nos dois; comparar no painel sem revelar valor. |
| `NEXT_PUBLIC_SITE_URL` | requer decisão | Existe em produção nos dois; o canônico deve terminar em `https://comunsocial.online` após a transferência. |
| `NEXT_PUBLIC_SUPABASE_URL` | requer decisão | Existe em produção nos dois e em Preview no canônico; confirmar project ref `nvmdszymrtacfehdynpg`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | requer decisão | Existe em produção nos dois e em Preview no canônico; confirmar chave ativa do mesmo projeto. |
| `SUPABASE_PROJECT_ID` | requer decisão | Existe em produção nos dois; confirmar `nvmdszymrtacfehdynpg`. |
| `SUPABASE_SERVICE_ROLE_KEY` | requer decisão | Existe em produção nos dois e em Preview no canônico; comparar/rotacionar no painel, nunca no cliente. |
| `NEXT_PUBLIC_SIDEWALK_BASEMAP_PROVIDER` | presente apenas no canônico | Restrita ao Preview da PR. Requer decisão explícita antes de criar escopo Production. |
| `NEXT_PUBLIC_VOLTA_REDONDA_PMTILES_URL` | presente apenas no canônico | Restrita ao Preview da PR. Validar hash, CORS e Range antes de Production. |
| `R2_ACCOUNT_ID` | presente apenas no canônico | Production; override de Preview existe somente para branch antiga. |
| `R2_ACCESS_KEY_ID` | presente apenas no canônico | Production; manter server-side. |
| `R2_SECRET_ACCESS_KEY` | presente apenas no canônico | Production; manter server-side. |
| `R2_ENDPOINT` | presente apenas no canônico | Production. |
| `R2_BUCKET_ORIGINALS` | presente apenas no canônico | Production; originais privados. |
| `R2_BUCKET_PUBLIC` | presente apenas no canônico | Production; somente derivadas públicas aprovadas. |
| `R2_PUBLIC_BASE_URL` | presente apenas no canônico | Production. |

### Resultado da classificação

- Idêntica comprovada: **nenhuma**, pois valores cifrados não foram expostos para comparação.
- Apenas no antigo: `COMUN_ADMIN_PASSWORD`, `MEDIA_STORAGE_PROVIDER`.
- Apenas no canônico: `COMUN_LOOKUP_HASH_SALT`, provider/PMTiles de Preview e conjunto R2 de Production.
- Escopo diferente: provider e PMTiles existem somente no Preview da PR; Supabase possui Preview e Production no canônico, mas apenas Production no antigo.
- Requer decisão: todas as variáveis comuns sensíveis/cifradas e o destino das duas variáveis legadas.

## Plano de transferência do domínio

### Pré-condições

1. banco remoto migrado e validado;
2. preview da PR aprovado em jornada completa;
3. equivalência das variáveis comuns confirmada no painel;
4. `NEXT_PUBLIC_SITE_URL` e callbacks Supabase preparados para o domínio público;
5. PMTiles validado com Range Requests no preview;
6. deployment de rollback registrado nos dois projetos;
7. pessoa responsável e janela comunicada.

### Sequência autorizável

1. copiar/configurar somente as variáveis ausentes aprovadas no canônico, por ambiente;
2. gerar ou reutilizar preview do mesmo commit e repetir smoke/no-leak;
3. registrar IDs, URLs, SHA e horário dos deployments de rollback;
4. reduzir interferência operacional, sem mudar nameservers;
5. remover `comunsocial.online` e `www.comunsocial.online` do `comun-social`;
6. anexar imediatamente ambos ao `comunvrabandonada`;
7. restaurar no canônico o redirect 308 de `www` para o apex;
8. verificar emissão/estado SSL, DNS, headers e redirects;
9. testar apex e `www` em janela anônima e rede externa;
10. manter `comun-social` sem domínio durante o período de segurança; não excluir o projeto;
11. se qualquer teste falhar, reanexar os domínios ao projeto antigo e confirmar o deployment `dpl_3PWgyGVUUyPBrdjdwR9kVfe5YLkG`.

### Meta de indisponibilidade

A troca entre projetos Vercel deve ser preparada como operação atômica e durar apenas o intervalo de detach/attach. Não alterar DNS reduz o risco de propagação. O rollback é a reanexação ao projeto antigo, que permanece intacto.

## Gates

- **G1 — configuração:** variáveis e integrações comparadas no painel por duas pessoas.
- **G2 — dados:** migrations e RLS aprovadas no ensaio e no remoto.
- **G3 — preview:** jornada completa, PMTiles/Range e no-leak aprovados.
- **G4 — domínio:** rollback registrado e transferência explicitamente autorizada.
- **G5 — merge:** somente depois do domínio canônico estável e monitorado.

## Declarações

- O candidato canônico foi definido apenas no plano; nenhuma configuração foi alterada.
- Nenhum domínio foi movido.
- Nenhuma variável foi copiada.
- Nenhum deploy manual foi executado.
- Nenhum projeto foi criado.
- Nenhum merge foi realizado.
