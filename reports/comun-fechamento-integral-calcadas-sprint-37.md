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
- lint, typecheck, build e 244 testes unitários;
- E2E canônico autenticado, com a mesma fixture descartável, da criação de conta ao pacote de pressão público e ao resultado parcial verificado.

## Aberto

- extensão do E2E único do pacote até protocolo, resposta e memória;
- protocolo, resposta e memória fixture operados integralmente e relacionados pela interface;
- performance integral contra `next start` com tabela completa;
- reset duplo, regressões históricas e production-like integral;
- gate humano com três participantes externos (atual: 0/3).

## Prova autenticada atualizada — 20/07/2026

A jornada canônica passou 10/10 em 360×800, 390×844, 768×1024, 1024×768 e 1366×768. O mesmo `runId` descartável percorreu cadastro, onboarding, JPEG fixture, ponto manual, envio privado, Minha área, moderação editorial, geometria pública aproximada, ficha pública, nova observação pré-moderada, aprovação da observação, prioridade, pacote de pressão em página/JSON/Markdown e registro de resultado parcial verificado pela Sala de Organização. O resultado foi ligado à pauta canônica, apareceu em `/comun/calcadas` e não marcou o registro como resolvido. O pacote foi verificado contra campos privados e o Axe não encontrou violações sérias ou críticas. A suíte encerrou com `COMUN_TEST_FIXTURES_CLEAN`.

Durante a prova foi corrigida uma falha real de atualização: a moderação da observação não revalidava a ficha pública do registro. A ação agora verifica erros de persistência e revalida também `/comun/calcadas/registros/[slug]`.

O percurso ainda não produz protocolo, resposta e memória relacionados pela interface. A auditoria confirmou que protocolos oficiais só podem nascer de `comun_reports`, enquanto a prioridade/ação das calçadas não possui associação operacional disponível nessa interface; também não existe ação administrativa para criar `comun_sidewalk_cycle_memories`. Criar essas superfícies seria nova funcionalidade, proibida neste fechamento. Por isso o fechamento integral permanece **NO-GO** e o marcador final não foi emitido. O gate humano segue 0/3.

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
