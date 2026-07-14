# Estado COMUN Sprint 17.2 - qualidade editorial de pautas

Data: 2026-07-07

## Objetivo

Criar uma camada editorial para pautas sociais: checklist de publicacao, historico de versoes da sintese publica e marcacao de evidencias que podem virar dossie.

## Checklist editorial

Bloco criado em `/comun/admin/pautas/[id]`.

Itens:

- sintese nao contem dados pessoais;
- sintese nao expoe contato privado;
- sintese nao usa resposta oficial completa sem resumo publico;
- ha pelo menos uma evidencia aprovada;
- o proximo passo esta claro;
- linguagem esta objetiva e nao ofensiva;
- ha distincao entre fato, relato e proposta;
- pauta nao publica contribuicao pendente;
- pauta pode virar dossie futuramente.

O checklist e persistido em `comun_pauta_spaces.editorial_checklist`.

## Historico de versoes

Tabela criada:

- `comun_pauta_synthesis_versions`

Sempre que o admin altera `public_synthesis` ou `next_step` pela action de pauta, o sistema registra:

- sintese anterior;
- sintese nova;
- proximo passo anterior;
- proximo passo novo;
- nota editorial;
- data.

O admin da pauta mostra as ultimas versoes. Restauracao de versao ficou fora deste sprint.

## Evidencias

Tabela criada:

- `comun_pauta_evidence_items`

Admin pode criar evidencia manual e marcar como evidencia:

- contribuicao aprovada;
- relato sanitizado;
- protocolo oficial sanitizado.

Campos operacionais:

- fonte;
- titulo;
- resumo;
- tipo de evidencia;
- sensibilidade;
- status;
- nota publica;
- nota interna.

## Pagina publica

`/comun/pautas/[slug]` ganhou secao:

- `Evidencias publicas`

Mostra apenas evidencias:

- `status='approved'`;
- `sensitivity='public_safe'`.

Campos exibidos:

- titulo;
- resumo;
- tipo;
- nota publica.

## Admin

`/comun/admin/pautas/[id]` foi reorganizada em blocos:

- Dados da pauta;
- Checklist editorial;
- Evidencias;
- Contribuicoes pendentes/aprovadas;
- Tarefas;
- Relatos/protocolos vinculados;
- Historico de versoes.

## Seguranca

Nao aparecem publicamente:

- evidencia `candidate`;
- evidencia `private_only`;
- evidencia `rejected`;
- evidencia `archived`;
- `internal_note`;
- `source_id`;
- `response_text` completo;
- `raw_text`;
- `private_contact`;
- `internal_notes`;
- signed URL;
- `storage_path`.

RLS:

- leitura publica de evidencias apenas para `approved + public_safe` em pauta publica nao arquivada.

## Documentacao

Atualizados:

- `docs/pautas-sociais.md`;
- `docs/operacao-comun.md`;
- `docs/deploy-checklist.md`.

Adicionada rotina "Como transformar uma pauta em dossie":

1. moderar contribuicoes;
2. aprovar evidencias;
3. revisar sintese publica;
4. preencher checklist editorial;
5. definir proximo passo;
6. so depois criar dossie.

## Smokes locais

Executados:

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm run build`: passou.
- `npm run verify`: passou.
- `npm run smoke:pauta-spaces`: passou.
- `npm run smoke:pauta-contribution-safety`: passou.
- `npm run smoke:pauta-editorial-quality`: passou.
- `npm run smoke:no-leak-http`: passou.
- `npm run smoke:public-ui`: passou.

Novo smoke:

- `scripts/smoke-comun-pauta-editorial-quality.mjs`
- `npm run smoke:pauta-editorial-quality`

Cobertura:

- cria pauta teste;
- edita sintese publica;
- confirma criacao de versao;
- cria evidencia candidate;
- confirma que nao aparece publicamente;
- aprova evidencia public_safe;
- confirma que aparece publicamente;
- cria evidencia private_only;
- confirma que nao aparece publicamente;
- confirma que internal_note nao vaza;
- confirma que checklist aparece no admin;
- limpa dados de teste.

## Deploy

Status: passou.

Deploy:

- `npx vercel deploy --prod --yes`
- producao em `https://comunvrabandonada.vercel.app`
- deploy Vercel: `https://comunvrabandonada-ljaq4in5w-alexandrevrabandonada-oss-projects.vercel.app`

Smokes em producao:

- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:pauta-spaces`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:pauta-contribution-safety`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:pauta-editorial-quality`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:no-leak-http`: passou.
- `NEXT_PUBLIC_SITE_URL=https://comunvrabandonada.vercel.app npm run smoke:public-ui`: passou.

## Riscos restantes

1. Checklist ainda e manual; nao bloqueia publicacao automaticamente.
2. Historico de versoes ainda nao permite restaurar uma versao.
3. Evidencias nao viram dossie automaticamente.
4. Marcacao de evidencias e operacional, ainda sem fluxo editorial de aprovacao em duas pessoas.

## Proximo tijolo recomendado

Criar rascunho admin de Dossie por Pauta a partir de evidencias aprovadas, ainda sem publicacao automatica.
