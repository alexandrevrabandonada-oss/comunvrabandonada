# Fechamento integral das calçadas — Sprint 37

**Data:** 20/07/2026  
**Status:** NO-GO integral

## Fechado

- núcleo cartográfico local, substituível e sem tiles remotos;
- geometria pública separada da privada;
- pan, zoom, clustering, mapa/lista e filtros por URL;
- contribuição autenticada já existente, fila editorial e publicação moderada;
- derivada pública revisada e original privado;
- observações históricas pré-moderadas;
- prioridade, roda, síntese, ação e tarefa pela interface de facilitador;
- pacote sanitizado em página pública local, Markdown e JSON versionado;
- lint, typecheck, build e 242 testes unitários.

## Aberto

- E2E único cobrindo toda a cadeia até memória;
- protocolo, resposta, resultado e memória fixture operados integralmente pela interface;
- E2E do pacote sanitizado com dados gerados pela própria jornada;
- performance integral contra `next start` com tabela completa;
- reset duplo, regressões históricas e production-like integral;
- gate humano com três participantes externos (atual: 0/3).

## Prova autenticada atualizada

A jornada participante foi alinhada ao formulário vigente e passou 10/10 em 360×800, 390×844, 768×1024, 1024×768 e 1366×768: cadastro, onboarding, JPEG fixture, ponto manual, condição Ruim, problema, revisão, envio, confirmação, Minha área e retorno à pauta. Axe e cleanup passaram; `COMUN_TEST_FIXTURES_CLEAN` foi emitido pela suíte.

Ainda falta unir essa jornada à persona editorial e continuar, no mesmo `runId`, até moderação, pacote, protocolo, resultado e memória. Portanto, não é o E2E integral final.

Não emitir `COMUN_SIDEWALK_REAL_MAP_LOCAL_OK` enquanto qualquer item acima permanecer aberto.

## Declarações

- Piloto público: NÃO ABERTO
- Integração principal: NÃO EXECUTADA
- Push: NÃO EXECUTADO
- Deploy: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Tiles remotos: NÃO UTILIZADOS NOS TESTES
- Dados reais: NÃO UTILIZADOS
- Custo externo: R$ 0
