# Estado atual do projeto — Sprint 37

**Atualizado em:** 20/07/2026  
**Escopo:** Mapa Real das Calçadas, fechamento técnico local  
**Branch local:** `codex/sprint-37-mapa-real-calcadas-local`  
**Commit técnico mais recente auditado:** `d261d13`  
**Decisão atual:** **NO-GO integral**

## Resumo executivo

O miniapp local do Mapa das Calçadas está funcional desde a contribuição autenticada até o registro de um resultado parcial verificado. A jornada automatizada cobre criação de conta, fotografia, localização, avaliação, envio privado, Minha Área, moderação, publicação, observação posterior, prioridade, mobilização, pacote de pressão e resultado.

O fechamento integral ainda não pode receber o marcador `COMUN_SIDEWALK_REAL_MAP_LOCAL_OK`. A mesma jornada não consegue produzir protocolo, resposta e memória relacionados exclusivamente pelas interfaces existentes. O gate humano também permanece em 0/3, e os gates de performance integral, resets integrais, regressões completas e execução production-like integral continuam abertos.

## Implementado

- rota canônica `/comun/calcadas`;
- cartografia local sintética e substituível, sem tiles remotos;
- pan, zoom, clustering, mapa/lista e filtros persistidos na URL;
- contribuição autenticada com JPEG e marcação manual de ponto;
- armazenamento do original privado e geração de derivada pública após revisão;
- separação entre geometria privada e geometria pública aproximada;
- fila editorial para registros e observações;
- publicação moderada e ficha pública por registro;
- observações posteriores com pré-moderação;
- prioridade com critérios e limitações públicas;
- roda, rodada, síntese, ação e tarefa;
- pacote público de pressão em HTML, JSON `schemaVersion 1.0` e Markdown;
- resultado parcial verificado pela Sala de Organização;
- limpeza de usuários, registros, imagens, observações, prioridades, ações e resultados descartáveis.

## Validado nesta etapa

| Gate | Resultado |
| --- | --- |
| Typecheck | Aprovado |
| ESLint | Aprovado |
| Testes unitários | 244/244 aprovados |
| E2E autenticado integral disponível | 10/10 aprovados |
| Viewports | 360×800, 390×844, 768×1024, 1024×768 e 1366×768 |
| Axe nas superfícies percorridas | Zero violações `serious` ou `critical` |
| Pacote sanitizado | HTML, JSON e Markdown aprovados, sem campos privados pesquisados |
| Cleanup | `COMUN_TEST_FIXTURES_CLEAN` confirmado |

A jornada usa um `runId` descartável por viewport e chegou a:

`FOTO → LOCALIZAÇÃO → AVALIAÇÃO → CADASTRO → ENVIO → MINHA ÁREA → MODERAÇÃO → PUBLICAÇÃO → OBSERVAÇÃO → PRIORIDADE → RODA/SÍNTESE/AÇÃO/TAREFA → PACOTE → RESULTADO PARCIAL`

O resultado foi associado à pauta `calcadas-em-circulacao`, publicado no miniapp e não alterou indevidamente o registro para “resolvido”.

## Correção comprovada durante a validação

A aprovação de uma observação atualizava o banco, mas a ficha pública específica permanecia obsoleta. A ação administrativa agora:

- verifica erros ao atualizar a observação;
- verifica erros ao atualizar o registro relacionado;
- recupera o `slug` do registro;
- revalida `/comun/calcadas/registros/[slug]` além das listagens.

## Pendências técnicas

1. Completar a mesma jornada com protocolo, resposta e memória relacionados.
2. Executar performance integral contra `next start` para 25, 100 e 500 registros, com payload, queries, média, P95, RSS, heap e quantidade renderizada.
3. Repetir dois resets integrais com novos usuários, sessões, registros e objetos de Storage.
4. Executar a cadeia production-like integral.
5. Executar e registrar todas as regressões históricas exigidas pela Sprint 37.
6. Completar as capturas autenticadas das superfícies ainda não alcançadas.

## Bloqueios de interface confirmados

- protocolos oficiais nascem de `comun_reports`;
- a prioridade/ação das calçadas não possui, na interface existente, associação operacional direta com esse relato/protocolo;
- não existe ação administrativa existente para criar `comun_sidewalk_cycle_memories`;
- portanto, protocolo, resposta e memória não podem ser ligados integralmente à fixture apenas pelas interfaces atuais;
- criar essas superfícies seria funcionalidade nova, expressamente proibida no fechamento da Sprint 37.

Esses bloqueios não devem ser contornados com registros desconectados ou inserções diretas apresentadas como prova de operação pela interface.

## Gates de liberação

| Dimensão | Estado | Motivo |
| --- | --- | --- |
| Técnica local integral | NO-GO | Cadeia ainda não alcança protocolo, resposta e memória |
| Experiência humana | NO-GO — 0/3 | Nenhum dos três testes humanos foi preenchido |
| Operação | NO-GO | Equipe ainda não realizou manualmente a cadeia completa |
| Cartografia real | NO-GO | Provider real e licença ainda não auditados |
| Ambiente remoto | NO-GO | Não revisado neste fechamento local |

## Histórico local recente

- `d261d13` — estende a jornada autenticada ao resultado;
- `0cf8f85` — amplia a jornada integral até pacote de pressão;
- `22b0870` — registra a jornada autenticada;
- `0d87623` — gera pacote sanitizado de pressão popular;
- `36a75b0` — conecta prioridades e mobilização.

## Declarações obrigatórias

- Piloto público: **NÃO ABERTO**
- Integração principal: **NÃO EXECUTADA**
- Push: **NÃO EXECUTADO**
- Deploy: **NÃO EXECUTADO**
- Supabase remoto: **NÃO ALTERADO**
- R2 real: **NÃO UTILIZADO**
- Tiles remotos: **NÃO UTILIZADOS NOS TESTES**
- Dados reais: **NÃO UTILIZADOS**
- Custo externo: **R$ 0**

## Conclusão

O núcleo local e a maior parte da jornada operacional estão comprovados, incluindo resultado parcial. O projeto permanece tecnicamente **NO-GO integral**, sem emissão de `COMUN_SIDEWALK_REAL_MAP_LOCAL_OK`, até que as lacunas de relacionamento por interface sejam resolvidas em escopo autorizado e os demais gates sejam repetidos integralmente.
