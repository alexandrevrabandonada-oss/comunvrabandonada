# Estado do deploy — comunsocial.online

Data: 19/07/2026.

## Vercel

- conta: `alexandrevrabandonada-oss-projects`;
- projeto: `comun-social`;
- framework: Next.js 16.2.10;
- target: production;
- deployment final: `dpl_CrVNd1v4vbsGVRbPtjkroGAMKyyu`;
- URL Vercel: `https://comun-social-lmey3ahri-alexandrevrabandonada-oss-projects.vercel.app`;
- status: READY;
- `/comun`: HTTP 200, identidade COMUN presente;
- aliases associados: `comunsocial.online`, `www.comunsocial.online` e `comun-social.vercel.app`;
- variáveis do Supabase remoto `nvmdszymrtacfehdynpg`, site, administração e provider de mídia configuradas como valores protegidos no ambiente Production;
- nenhuma variável pública de produção referencia localhost; CSP permite conexão com o host remoto correto.

## DNS Hostinger

Nameservers detectados: `orbit.dns-parking.com` e `horizon.dns-parking.com`.

Estado final informado pela Vercel: **configured**, sem conflitos.

Alterações aplicadas no hPanel:

- apex `@`: A `76.76.21.21`, TTL 300;
- `www`: CNAME `cname.vercel-dns.com`, TTL 300;
- registros não relacionados ao site preservados.

Os nameservers autoritativos e o Google DNS retornaram os valores novos. O certificado `cert_1TrPCtNNES2YE45pYktVRxj0` cobre apex e `www`, com renovação automática. `https://comunsocial.online/comun` responde HTTP 200 e `www` redireciona permanentemente (308) para o apex.

## Verificação pública

- `/comun`: HTTP 200;
- `/comun/comunidades`: HTTP 200;
- `/comun/entrar`: HTTP 200;
- identidade COMUN presente nas respostas;
- HTTPS e HSTS ativos;
- produção Vercel: READY;
- domínio canônico: `https://comunsocial.online`.

## Segurança e rastreabilidade

- nenhum valor secreto foi registrado neste relatório ou no Git;
- `.vercel` permanece ignorado;
- o deploy de produção foi autorizado explicitamente pelo titular;
- não houve alteração de registros de e-mail.
