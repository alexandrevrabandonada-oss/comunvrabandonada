# Tijolo 43 — diagnóstico do ciclo operacional das Calçadas

Atualizado em 24 de julho de 2026.

## Ponto de partida

- `main`: `4a9e2d4f341e755b3a1aa969c26344f4f4334bae`;
- branch: `codex/tijolo-43-calcadas-ciclo-operacional`;
- produção: `COMUN_NUCLEO_VIVO_PRODUCTION_GREEN`;
- gate humano: 0/3;
- piloto público: fechado;
- Supabase remoto: não alterado;
- migration criada neste diagnóstico: nenhuma.

O diagnóstico foi feito por leitura do App Router, Server Actions, helpers,
migrations, RLS, testes e scripts locais. A documentação oficial vigente de
RLS e Storage do Supabase e o changelog foram consultados antes de avaliar
qualquer mudança de schema. Nenhuma escrita remota foi executada.

## Inventário classificado

| Superfície | Estado | Evidência e lacuna |
| --- | --- | --- |
| `/comun/calcadas` | READY | Mapa real, lista equivalente, busca e filtros básicos; somente registros públicos chegam ao componente. |
| `/comun/mapa/contribuir` | PARTIAL | Câmera/arquivo, GPS, ajuste manual, sessão anônima, upload privado e confirmação existem; faltam consentimento explícito, impacto de acessibilidade estruturado e revisão final dos dados antes do envio. |
| upload direto privado | PARTIAL | Ticket curto, MIME/tamanho, chave única, URL assinada, confirmação server-side e cleanup existem; confirmações concorrentes ainda podem iniciar duas persistências. |
| Storage | REMOTE_READY | Bucket `archive-private-originals`, original privado e derivada moderada estão modelados; nenhuma leitura pública do original. |
| registros | READY | `comun_sidewalk_records` separa geometria privada, pública e sugerida, autoria privada, estado, verificação e visibilidade. |
| fotos | READY | Original e derivada possuem ativos distintos, checklist, revisão e `is_public`. |
| fila `/comun/admin/calcadas` | PARTIAL | Aprova, aproxima, publica sem imagem, pede complemento, rejeita e retira; não oferece decisão assistida de duplicidade nem histórico operacional legível por registro. |
| observações/verificação | PARTIAL | Observações próximas e moderação existem; não há superfície completa de tarefas comunitárias com objetivo, prazo, segurança, responsável e decisão. |
| duplicidades | DISCONNECTED | Há helper por hash e vínculos genéricos, mas não há sugestão multissinal nem decisão humana `MERGED/RELATED/DISTINCT`. |
| prioridades | READY | Decisão humana, critérios, evidências, divergências, limitações, síntese e registros relacionados existem. |
| propostas e ações | READY | Síntese e prioridade podem gerar ação; o encaminhamento preserva objetivo e proposta públicos. |
| encaminhamentos | READY | Fluxo rascunho → revisão → correção/aprovação → protocolo está implementado com autorização por papel e auditoria. |
| protocolos | READY | Registro manual/fixture, órgão, número, data, prazo, resposta e estado estão conectados ao ciclo. Nenhum envio externo automático. |
| resultados | READY | Resultado exige evidência, continuidade e verificação; não resolve registros automaticamente. |
| memória | READY | Memória nasce em revisão e só depois se torna pública; mantém vínculos com prioridade, ação, protocolo e resultado. |
| ficha pública do registro | PARTIAL | Conteúdo sanitizado e vínculos existem; falta uma linha operacional uniforme com estado atual, última mudança e próxima ação. |
| Minha Participação | PARTIAL | Contribuições gerais, tarefas, resultados e inbox aparecem; os registros próprios de calçada ainda não formam uma projeção explícita do ciclo completo. |
| Caixa de entrada | READY | Tipos do ciclo, deduplicação e links acionáveis existem; algumas mensagens apontam para a área geral em vez da entidade exata. |
| RLS e grants | READY | Tabelas operacionais têm RLS, escrita server-side e leitura do próprio registro/ticket para usuário autenticado. |
| fixtures e cleanup | READY | Demo local, reset, assert-clean e limpeza de uploads órfãos existem. |
| testes geográficos | READY | MapLibre, PMTiles, GPS, captura, RLS e no-leak possuem cobertura anterior. |
| suíte operacional do Tijolo 43 | DISCONNECTED | Ainda não há os três comandos canônicos específicos pedidos para o ciclo completo. |

## Ciclo existente

O repositório já contém a maior parte do ciclo:

`REGISTRO → TRIAGEM → PUBLICAÇÃO → PRIORIDADE → AÇÃO → ENCAMINHAMENTO →
PROTOCOLO → RESPOSTA → RESULTADO → MEMÓRIA`.

As lacunas não justificam uma migration antes da implementação. Elas estão
principalmente na composição das superfícies e nos contratos de operação:

1. tornar a confirmação do upload idempotente sob concorrência;
2. registrar consentimento e impacto de acessibilidade no payload já privado;
3. oferecer revisão final antes do envio;
4. projetar estado, última mudança e próxima ação para o autor;
5. ampliar a fila com complemento e duplicidade assistida;
6. criar tarefas comunitárias de verificação seguras;
7. tornar os filtros públicos compatíveis com o contrato do Tijolo 43;
8. consolidar testes E2E, Axe e smoke numa suíte operacional.

## Segurança e privacidade

- `service_role` permanece exclusivamente server-side;
- coordenada exata fica em `private_geometry_geojson`;
- o mapa usa `public_geometry_geojson`;
- ticket, `object_key`, payload do upload e precisão do GPS não pertencem a
  consultas públicas;
- derivada pública só é criada na moderação;
- o original permanece no bucket privado;
- a autorização da equipe é validada novamente em cada Server Action;
- decisões de RLS não dependem de `user_metadata`.

## Decisão de schema

**Reutilizar o schema existente.**

Não foi provada lacuna que exija migration neste ponto. Idempotência pode ser
obtida usando o ticket já único e uma transição condicional de estado; o
acompanhamento pode ser projetado a partir de registros, links, prioridades,
encaminhamentos e inbox existentes. Se os testes demonstrarem que a transição
atômica não é expressável com o constraint atual, a necessidade de uma única
migration forward-only será reavaliada e documentada antes de qualquer criação.

## Próxima sequência

1. endurecer a captura e a confirmação;
2. consolidar a projeção operacional do registro;
3. completar moderação, complemento e duplicidade assistida;
4. completar verificação comunitária;
5. alinhar mapa, Minha Participação e Caixa;
6. criar testes canônicos;
7. executar gates locais e decidir entre
   `COMUN_CALCADAS_OPERATIONAL_READY` e
   `COMUN_CALCADAS_OPERATIONAL_REQUIRES_PROMOTION`.

