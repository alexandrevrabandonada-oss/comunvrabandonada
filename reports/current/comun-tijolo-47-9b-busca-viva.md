# Tijolo 47.9B — Busca Viva e Inteligência Cívica transversal

Atualizado em 31 de julho de 2026.

## Decisão terminal

`COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY`

Os contratos controláveis pelo COMUN estão implementados e verdes, mas a
capacidade semântica remota ainda não está operacional. O runtime nativo de
embeddings foi verificado e o schema remoto suporta `vector`, porém falta a
credencial de gestão necessária para transportar a Edge Function. Por isso a
projeção remota preserva 10 documentos públicos e 30 seções, mas mantém zero
seções com embedding real. Não houve ensaio com pessoas e `GREEN` não é
declarado.

## Linhagem

- base: `e73060f9abb8170a4fb34908cd32dd49fd96e92b`;
- branch principal: `codex/tijolo-47-9b-busca-viva-inteligencia-civica`;
- PR principal: #126, candidato `b68925fb501cfaef0c0e522f9c60589f42692dac`,
  merge `0bb7d0eb4e3c948a5004f9d88bd98a7d65d67657`;
- transporte focal: PR #127, merge
  `ddefe725e42d9a3f2e1463fb005ffa266c794fdb`;
- cache remoto focal: PR #128, merge
  `b48658c58b06335a48541f9cfb0753b6ff387959`;
- observabilidade focal: PR #129, candidato
  `c6ca0b240c7343b1d7f8eb9a913760d53838a694`, merge
  `f4cb2b4004f9b33a9d9ca0846c49f2fec4970cad`;
- ensaio remoto final: run `30669629360`, sucesso;
- Production: deployment `5698955589`, sucesso no SHA final.

## Implementação comprovada

- `unifiedPublicSearch` permanece como fallback funcional e como resultado
  inicial renderizado no servidor;
- `/comun/busca` preserva deep links com redirect 308 para `/comun/buscar`;
- projeção reconstruível e exclusivamente `public_projection`;
- FTS português com `unaccent`, `pg_trgm`, GIN e prioridade exata;
- índice HNSW e RPC híbrida com RRF 60, acessíveis somente pelo servidor;
- 13 intenções tipadas, rotas canônicas allowlisted e zero mutações;
- Memória Viva estruturada e relacionados limitados a quatro;
- geração textual desativada por contrato;
- consulta bruta não persistida, não ligada a identidade e ausente dos
  artifacts;
- métricas sanitizadas, rate limit, timeout e fallback progressivo;
- três pilotos opt-in por `?inteligencia=busca-viva` sem alterar o padrão do
  47.9A.

## Banco, provider e permissão

As migrations aditivas `20260731183339` e `20260731220000` estão no ledger
remoto com checksum validado. PostgreSQL 17, `vector`, `unaccent`, `pg_trgm` e
FTS português foram observados. O modelo contratado é `gte-small`, versão
`native-v1`, dimensão esperada 384; a dimensão remota não foi observada porque
o provider não foi transportado. A documentação do provedor o declara voltado
a inglês, portanto relevância em português não foi presumida. A capacidade
incluída observada informa 500 mil invocações mensais, sem overage no plano
Free; saldo atual e custo marginal não são expostos e nenhum plano foi alterado.

`COMUN_CIVIC_SEARCH_PERMISSION_BOUNDARY_GREEN` foi comprovado para `anon`,
autenticado, membro, outra comunidade, coordenador, operador, administrador,
papel revogado e `service_role`: tabelas, jobs e embeddings não têm leitura
direta; escrita de métricas e RPC privilegiada são bloqueadas; projeção privada
é rejeitada; observabilidade sanitizada server-side está disponível; seis
funções privilegiadas têm grants mínimos e `search_path` fixo.

## Evals, desempenho e ensaio

O corpus `47.9b-v1` contém 110 casos: 20 exatos, 20 semânticos, 20 intenções,
15 erros de digitação, 15 ambiguidades, 10 ausências e 10 consultas
adversariais. Resultados válidos nesta capacidade:

- busca exata Top 3: 100%;
- precisão de intenção: 100%;
- redirects automáticos incorretos: 0;
- violações de permissão: 0;
- rotas inválidas: 0;
- respostas sem fonte: 0;
- `Recall@5` semântico e MRR: não medidos, porque embeddings reais não foram
  executados.

O ensaio controlado remoto passou 16/16 cenários, incluindo fallback, provider
indisponível, embedding obsoleto, despublicação, revogação, outra comunidade,
rate limit, prompt injection e cleanup. Usou apenas fixtures sintéticas
transacionais, não incluiu conteúdo privado real e confirmou cleanup.

Em banco descartável, a consulta única com filtros e sem N+1 mediu p95 de
5,04 ms em 25 documentos, 2,85 ms em 50, 3,18 ms em 100, 9,40 ms em 500 e
19,19 ms em 1.000. Em Production, o smoke pós-merge observou a API lexical em
603 ms e o fallback semântico em 756 ms. O baseline anterior da página tinha
p95 de 3.943,6 ms e orçamento de 4.732,3 ms; o pós-merge observado ficou dentro
desse orçamento, sem pretensão de amostra estatística equivalente.

## Production e limites honestos

Home, busca e piloto retornaram HTTP 200; a API lexical retornou quatro
resultados com `semanticState=disabled`; ao solicitar semântica, os mesmos
quatro resultados foram preservados com `semanticState=unavailable`. A resposta
usa `Cache-Control: private, no-store`. O smoke público e o no-leak passaram.

A primeira tentativa de transporte remoto falhou fechada por ausência da
credencial de gestão. O banco foi transportado por conexão PostgreSQL
allowlisted, sem chave de provider no banco e sem publicar conteúdo. O provider
real continua bloqueado; jobs falhos ficam observáveis e isolados, sem impedir
busca lexical.

## Estados preservados

- 47.9A: `COMUN_EXPERIENCE_COHERENCE_READY_FOR_USABILITY_REHEARSAL`;
- `security_resilience=blocked`, por recovery point durável independente e
  cópia secundária de Storage ausentes;
- `miniapps=in_progress`;
- `archive_radio_art=evidence_required`;
- quatro domínios formais permanecem verdes;
- `launch_publicly` não foi acionado.

Próxima ação do 47.9B: disponibilizar uma credencial de gestão Supabase
rotacionável e escopada, transportar a Edge Function, reindexar explicitamente,
medir `Recall@5`/MRR com embeddings reais em português e então executar o ensaio
controlado com pessoas. O 47.9C pode prosseguir no roadmap, enquanto esse
blocker permanece explícito e continua impedindo promoção e lançamento.
