# Diagnóstico de comunidades — Sprint 36

Data: 19/07/2026. Escopo: ambiente local e fixtures sanitizadas.

## Classificação

| Item | Estado | Evidência / decisão |
|---|---|---|
| Schema e comunidades | existente, mas desconectado | `community` sustenta identidade básica; o contrato organizativo rico permanece em fixture tipada, sem migration prematura. |
| Rotas e páginas | existente e utilizável | descoberta, detalhe, participação autenticada e agenda ICS possuem rotas próprias. |
| Memberships | exige decisão de domínio | não há membership comunitário persistente completo; preferências locais não concedem papel. |
| Papéis | precisa de adaptação | responsabilidades são apresentadas publicamente, mas atribuição operacional continua protegida e não foi criada nesta sprint. |
| Pautas relacionadas | existente e utilizável | comunidade aponta para a pauta original e preserva seu contexto. |
| Rodas e deliberação | existente, mas desconectado | etapa, pergunta, síntese, divergência e encaminhamento são expostos; participação persistente ainda depende do fluxo próprio da pauta. |
| Tarefas | existente, mas desconectado | Minha área já agrega responsabilidades; grupo comunitário ainda não possui entidade persistida própria. |
| Agenda | existente e utilizável | atividade contextualizada e download local `.ics`, sem integração externa. |
| Resultados | precisa de adaptação | separa atividade de resultado comprovado e mostra ausência honesta; falta vínculo persistido específico. |
| Arte, Rádio, Acervo e memória | existente e utilizável | links apontam para fontes originais, sem cópia. |
| Busca | precisa de adaptação | filtro na descoberta funciona; busca unificada ainda não agrupa comunidades. |
| Estados vazios | existente e utilizável | filtros sem resultado orientam limpar/rever critérios; resultado ausente não é inventado. |
| Autorização | existente e utilizável | exploração é pública; acompanhar/alterar preferências exige sessão e retorno seguro. |
| Mobile e acessibilidade | existente e utilizável | cinco viewports e Axe sem violações serious/critical na suíte comunitária. |
| Offline | existente e utilizável | páginas públicas estão na allowlist; áreas privadas, API e mutações ficam fora do cache. |
| Home autenticada | precisa de adaptação | não ganhou blocos comunitários nesta entrega; não foi criada seção vazia. |
| Caixa de entrada | existente, mas desconectado | contrato atual evita vaidade, porém não recebe novos eventos comunitários persistidos. |

## Decisão arquitetural

Não foi criada migration. O diagnóstico mostra que membership, grupos, resultados e preferências precisam de decisão conjunta de domínio, autorização e retenção antes de persistência. Nesta entrega, fixtures finitas e preferências locais não sensíveis permitem validar a experiência sem simular vínculo operacional nem tocar Supabase remoto.

## Riscos restantes

- persistência multiusuário de acompanhamento e saída;
- autorização de facilitador e atribuição de papéis;
- integração da home autenticada, inbox e busca unificada;
- cenários residuais de autenticação/upload/envio pedidos no Gate 0 não foram ampliados nesta sprint;
- avaliação humana independente ainda não executada.
