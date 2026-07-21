# Auditoria de navegação mobile — Sprint 40.1

Viewports: 360×800, 390×844 e 768×1024.

| Elemento simultâneo   |                             Antes |               Depois | Decisão                                                     |
| --------------------- | --------------------------------: | -------------------: | ----------------------------------------------------------- |
| destinos globais      |                                 5 |                    5 | Início, Explorar, Participar, Caixa e Minha área            |
| app bar               |                               0/1 |                    1 | voltar, título/contexto curto e menu                        |
| breadcrumb            |                                 1 |                    0 | oculto no mobile; rota preservada na app bar/trilha         |
| título grande         |                                 1 |                  0–1 | removido do shell do miniapp; mantido no conteúdo editorial |
| contexto              |                       até 5 links |              1 linha | restante em “Sobre este processo”                           |
| tabs locais           |                                 4 |                    4 | somente no miniapp, uma linha rolável                       |
| CTA primário          |                             até 2 |                    1 | registrar calçada                                           |
| busca                 |                ícone + formulário |        Explorar/menu | busca unificada preservada                                  |
| compartilhar          |                         cabeçalho |         menu/desktop | não compete no mobile                                       |
| instalar              |                           overlay | 0 nas telas críticas | permitido após confirmação, Minha área ou Conta             |
| toast                 | externo/incompatível na evidência |             0 do app | nenhum publisher incompatível encontrado                    |
| assistente/personagem |                           externo |             0 do app | não existe no DOM do COMUN                                  |
| filtros do mapa       |                                 6 |                    6 | pertencem à ferramenta, abaixo do CTA                       |

Duplicações eliminadas: Territórios/Comunidades na bottom nav, breadcrumb horizontal, logo/cabeçalho global dentro do miniapp e CTA repetido. Ações raras foram movidas para o menu `⋯` ou para Explorar.

## Fechamento

- contratos conferidos nos três viewports definidos;
- app bar responsiva confirmada em uma linha após correção visual;
- nenhuma sobreposição ou rolagem horizontal detectada;
- navegação desktop preservada a partir do breakpoint `lg`;
- decisão: `COMUN_MOBILE_APP_SHELL_LOCAL_OK`.
