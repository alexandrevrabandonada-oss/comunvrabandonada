# Estado do COMUN — Sprint 36.1 Comunidades Persistentes (local)

Data: 19/07/2026. Branch: `codex/comun-comunidades-persistentes-local`. Base: `16a96dfb`.

## Resultado

A vertical comunitária passou a persistir vínculo, estado e preferências no Supabase local. A mesma fonte alimenta a participação, Home autenticada, Minha área e Inbox; a busca pública passou a incluir comunidades sem ranking de popularidade. Papéis, capacidades e grupos de trabalho ganharam estruturas próprias, RLS e consultas servidoras, preservando pautas, rodas, tarefas, resultados, Arte, Rádio e Acervo como fontes de verdade existentes.

Estados entregues: `following`, `member`, `paused`, `left` e `suspended`. A saída preserva auditoria; a suspensão bloqueia retomada; preferências não promovem papel nem autorização.

## Evidências

- migration aditiva aplicada em dois resets locais completos;
- lint, typecheck e build Next.js 16.2.10 aprovados;
- 36 arquivos de testes unitários, 219/219 aprovados;
- matriz RLS: `RLS_MATRIX_OK`;
- smoke de persistência e isolamento: `COMMUNITY_PERSISTENCE_OK`;
- jornada comunitária: 35/35 em cinco viewports após o segundo reset;
- execução production-like (`next start`): 7/7 em 390x844;
- PWA: 20/20 em cinco viewports;
- autenticação local: `COMUN_COMMUNITY_AUTH_LOCAL_OK`;
- integral: 10/10, duas provas por viewport, com cleanup confirmado;
- revisão visual de dez capturas e Axe sem achados serious/critical.

## Limites conhecidos

- comunidades que futuramente exigirem aprovação ainda precisam de fluxo próprio de solicitação; o modelo atual implementa entrada direta nos fixtures vigentes;
- concessão de papéis e gestão de grupos estão disponíveis no domínio/servidor, sem nova interface administrativa;
- Inbox registra acompanhamento e saída; publicadores de círculo, tarefa e resultado permanecem como integração posterior;
- o gate humano independente não foi executado;
- a matriz residual completa de erros de autenticação/PWA da Sprint 36 não foi repetida integralmente nesta sprint;
- production-like cobriu a jornada completa comunitária em um viewport, com os cinco viewports cobertos no servidor de desenvolvimento.

## Decisão

**PRONTA PARA GATE HUMANO LOCAL; NÃO PRONTA PARA PILOTO PÚBLICO NEM INTEGRAÇÃO PRINCIPAL.**

## Declarações obrigatórias

- Piloto público: **NÃO ABERTO**
- Integração principal: **NÃO EXECUTADA**
- Push: **NÃO EXECUTADO**
- Deploy: **NÃO EXECUTADO**
- Supabase remoto: **NÃO ALTERADO**
- R2 real: **NÃO UTILIZADO**
- Serviços externos: **NÃO UTILIZADOS**
- Dados reais: **NÃO UTILIZADOS**
- Custo externo: **R$ 0**
