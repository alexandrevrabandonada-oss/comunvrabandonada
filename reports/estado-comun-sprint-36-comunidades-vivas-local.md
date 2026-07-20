# Estado do COMUN — Sprint 36 Comunidades Vivas (local)

Data: 19/07/2026. Branch: `codex/comun-comunidades-vivas-local`.

## Entregue

- contrato de comunidade persistente e não social-feed;
- descoberta pública com busca, tipo, tema e ação aberta;
- cartões com propósito, território/tema, próxima ação, atividade e estado;
- página hierarquizada com pauta, roda, grupos, agenda ICS, cultura, resultado/memória e governança;
- acompanhamento autenticado com retorno seguro e preferências opcionais locais não sensíveis;
- integração em Minha área, sem criar seções vazias;
- cache público seguro e ícones PNG 192/512/maskable;
- testes unitários, E2E, responsividade e acessibilidade.

## Não concluído / bloqueios de produto

- membership, saída e preferências persistentes foram concluídos na Sprint 36.1;
- home autenticada, Minha área, inbox e busca unificada consomem a fonte persistente;
- papéis, capacidades e grupos ganharam persistência e autorização servidora, ainda sem interface administrativa;
- fluxo de solicitação/aprovação para comunidade moderada e publicadores avançados da Inbox continuam pendentes;
- matriz integral de membro/facilitador/comunidade vazia/roda encerrada/sessão expirada é parcial;
- cobertura residual do Gate 0 para e-mail usado, senha inválida, sessão expirada, foto removida, falhas de upload/envio e troca de usuário não foi ampliada;
- gate humano independente pendente.

## Qualidade executada

- lint e typecheck: aprovados;
- unitários: 219/219 na Sprint 36.1;
- build Next.js 16.2.10: aprovado;
- comunidade: 30/30, cinco viewports;
- PWA: 20/20;
- integral: 10/10;
- calçadas: 75/75 por projeto; timeout anterior diagnosticado como duração serial agregada acima do limite externo, não teste travado;
- Axe comunitário: zero serious/critical;
- cleanup de fixtures: confirmado.

Atualização detalhada: `reports/estado-comun-sprint-36-1-comunidades-persistentes-local.md`.

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
