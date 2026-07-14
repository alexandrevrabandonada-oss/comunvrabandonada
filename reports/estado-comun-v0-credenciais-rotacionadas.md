# Estado COMUN v0 - Credenciais e Producao

Data: 2026-05-25

## URL publica

- `https://comunvrabandonada.vercel.app`

## Resumo executivo

- A rotacao imediata de credenciais ficou preparada e documentada em [docs/rotacao-credenciais-final.md](</C:/Projetos/COMUM VR ABANDONADA/docs/rotacao-credenciais-final.md>).
- A rotacao em si nao foi executada neste ciclo, porque depende da troca de segredos no painel do Supabase e na Vercel sem expor valores em chat.
- Foi feito novo deploy de producao na Vercel para corrigir a leitura publica de relatos publicados no dominio.
- O COMUN publicado segue acessivel, o admin segue protegido e os smokes finais passaram contra o dominio publico.

## Credenciais

Status da rotacao:

- Supabase CLI access token: pendente de revogacao e reemissao manual.
- `SUPABASE_SERVICE_ROLE_KEY`: pendente de rotacao manual no Supabase e atualizacao na Vercel.
- Senha do banco Supabase: pendente de rotacao manual e atualizacao local segura.

Regra mantida:

- nenhum valor sensivel foi registrado em arquivo versionado novo;
- nenhum valor sensivel foi impresso no relatorio.

## Status da Vercel

- Projeto de producao: publicado e `Ready`.
- URL publica confirmada: `https://comunvrabandonada.vercel.app`.
- `NEXT_PUBLIC_SITE_URL` permanece apontando para o dominio publico.
- Env vars operacionais continuam documentadas em [docs/vercel.md](</C:/Projetos/COMUM VR ABANDONADA/docs/vercel.md>).
- A troca efetiva de segredos na Vercel segue pendente junto da rotacao manual.

## Redeploy

- Redeploy de producao executado com sucesso em 2026-05-25.
- Motivo: a pauta publica em producao estava servindo estado desatualizado para relatos publicados.
- Ajuste aplicado: paginas publicas dependentes de Supabase passaram a forcar renderizacao dinamica e a leitura de `comun_public_reports` ganhou fallback server-side por service role, restrito ao servidor.

## Verify

- `npm run verify`: passou.

## Smokes

- `npm run smoke:comun`: passou.
- `npm run smoke:admin-auth`: passou contra `https://comunvrabandonada.vercel.app`.
- `npm run smoke:no-leak-http`: passou contra `https://comunvrabandonada.vercel.app`.

## Producao publicada

Status no dominio publico:

- `/comun`: acessivel.
- `/comun/relatar`: acessivel sem login.
- `/comun/admin`: continua exigindo autenticacao.
- `/comun/pautas/trabalho-burnout-volta-redonda`: passou a exibir o `public_text` publicado.

## Teste manual em producao

- Navegacao publica no dominio: validada por smoke HTTP.
- Gate de admin no dominio: validado por smoke HTTP.
- Fluxo completo de navegador comum com login real, revisao, publicacao e logout em producao: ainda pendente de passada manual dedicada.

## Teste mobile real

- Ainda pendente em celular real por 4G/5G, WhatsApp e Instagram.
- Continua valendo o checklist em [docs/deploy-checklist.md](</C:/Projetos/COMUM VR ABANDONADA/docs/deploy-checklist.md>) e [docs/rotacao-credenciais-final.md](</C:/Projetos/COMUM VR ABANDONADA/docs/rotacao-credenciais-final.md>).

## Nao vazamento

Confirmado:

- `raw_text` nao aparece publicamente;
- `private_contact` nao aparece publicamente;
- `internal_notes` nao aparecem publicamente;
- a pauta publica validada retorna apenas o conteudo sanitizado esperado.

## Auditoria

- Auditoria ja havia sido validada localmente com eventos reais.
- Nenhuma alteracao neste ciclo removeu ou enfraqueceu esse fluxo.

## Busca final por segredos

Resultado:

- nao foram encontrados valores reais de segredo em arquivos versionados;
- foram encontrados apenas termos de risco e placeholders documentais em docs e reports, o que exige atencao normal, mas nao indicou exposicao adicional nesta arvore versionada.

## Arquivos criados ou alterados neste ciclo

- [docs/rotacao-credenciais-final.md](</C:/Projetos/COMUM VR ABANDONADA/docs/rotacao-credenciais-final.md>)
- [lib/reports.ts](</C:/Projetos/COMUM VR ABANDONADA/lib/reports.ts>)
- [app/comun/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/page.tsx>)
- [app/comun/comunidades/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/comunidades/page.tsx>)
- [app/comun/c/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/c/[slug]/page.tsx>)
- [app/comun/pautas/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/pautas/[slug]/page.tsx>)
- [app/comun/dossies/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/dossies/page.tsx>)
- [app/comun/dossies/[slug]/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/dossies/[slug]/page.tsx>)

## Pendencias restantes

- executar a rotacao real das tres credenciais sensiveis fora deste chat;
- atualizar `.env.local` localmente com os novos valores;
- atualizar as env vars sensiveis na Vercel;
- fazer novo redeploy apos a rotacao real;
- repetir `verify` e os tres smokes apos a troca;
- fazer a passada manual em navegador comum no dominio publicado;
- registrar o teste em celular real.

## Proximo tijolo recomendado

- executar a rotacao real das credenciais e fechar a validacao operacional final em producao com teste manual no navegador comum e no celular real.
