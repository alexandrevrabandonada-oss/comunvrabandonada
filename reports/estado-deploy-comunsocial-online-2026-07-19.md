# Estado do deploy — comunsocial.online

Data: 19/07/2026.

## Vercel

- conta: `alexandrevrabandonada-oss-projects`;
- projeto: `comun-social`;
- framework: Next.js 16.2.10;
- target: production;
- deployment: `dpl_137RodJxV1Hc43TmJW4rhxHQjNf7`;
- URL Vercel: `https://comun-social-f3fky1ieq-alexandrevrabandonada-oss-projects.vercel.app`;
- status: READY;
- `/comun`: HTTP 200, identidade COMUN presente;
- aliases associados: `comunsocial.online`, `www.comunsocial.online` e `comun-social.vercel.app`;
- variáveis de Supabase, site, administração e provider de mídia configuradas como valores protegidos no ambiente Production.

## DNS Hostinger

Nameservers detectados: `orbit.dns-parking.com` e `horizon.dns-parking.com`.

Estado atual informado pela Vercel: **misconfigured**.

Alterações necessárias no hPanel:

- apex `@`: substituir o A atual `2.57.91.91` por `76.76.21.21`;
- `www`: substituir o apontamento atual para o apex por CNAME `cname.vercel-dns.com`;
- preservar registros de e-mail e demais registros não relacionados ao site.

O painel Hostinger exigiu autenticação. A mudança DNS não foi aplicada sem sessão do titular. Após a alteração, confirmar propagação, TLS e redirecionamento canônico antes de declarar o domínio pronto.

## Segurança e rastreabilidade

- nenhum valor secreto foi registrado neste relatório ou no Git;
- `.vercel` permanece ignorado;
- o deploy de produção foi autorizado explicitamente pelo titular;
- não houve alteração de registros de e-mail.
