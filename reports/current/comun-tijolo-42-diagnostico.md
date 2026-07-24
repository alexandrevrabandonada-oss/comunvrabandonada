# Tijolo 42 — diagnóstico do núcleo vivo

Atualizado em 24 de julho de 2026.

## Baseline

- `main` inicial: `7152bb7d946ac4245053ae3cd0e2563a3822ac51`;
- branch: `codex/tijolo-42-nucleo-vivo`;
- produção: `SOLO_PRODUCTION_GREEN`;
- piloto público: fechado;
- gate humano: 0/3;
- banco remoto: não alterado nesta auditoria.

## Inventário das superfícies

| Superfície | Implementação atual | Diagnóstico |
| --- | --- | --- |
| `/comun` | home pública e home autenticada distintas | oferece muitos caminhos e módulos antes de estabelecer uma pauta e uma participação concreta |
| `/comun/explorar` | índice por categorias | útil como busca secundária; não deve ser a narrativa principal |
| `/comun/pautas/[slug]` | dois renderizadores: shell modular e página legada | duplicação estrutural e experiência divergente entre pautas |
| `/comun/calcadas` | miniapp completo com mapa, lista, prioridades, mobilização e resultados | tecnicamente forte, mas visualmente percebido como produto separado |
| `/comun/mapa/contribuir` | captura autenticada, retorno seguro e confirmação | já implementa o ciclo concreto mais completo do produto |
| `/comun/participar` | formulário geral de interesse com contato privado | pede dados antes de oferecer contexto suficiente e compete com ações específicas |
| `/comun/minha-participacao` | contribuições, acompanhamento, tarefas e resultados | já reúne continuidade, mas não explicita pauta e próximo passo em todos os itens |
| `/comun/caixa-de-entrada` | mensagens operacionais com ação contextual | boa base; precisa de linguagem de consequência e retorno |
| `/comun/c/[slug]` | comunidade, governança, grupos, rodas e memória | rica, porém a relação principal com a pauta Calçadas não domina a hierarquia |
| Acervo, Arte e Rádio | superfícies editoriais publicadas e ligáveis por pauta | devem entrar como memória e expressão relacionadas, não como catálogos na Home |

## Componentes reutilizáveis

- `PautaAppShell`: base do shell modular;
- `ComunContextTrail`: território → comunidade → pauta → ferramenta;
- `SidewalkMapModule`: entrada contextual para o mapa e registro;
- `SidewalkMiniappShell`: contexto e retorno para a pauta;
- `ComunContinuityTimeline`: atualizações públicas;
- `MiniAppContextCard`: resumo do miniapp;
- `ComunSection`, `ComunStatus`, `ComunEmptyState`: estados editoriais;
- `getPersonalCenter`, `listMyParticipation`, `listMemberInbox`: continuidade
  autenticada;
- `listPublicPautaModules`, `listPublicCircleSurface`,
  `listPublicSidewalkSurface`: composição pública segura.

## Fluxos duplicados ou desconectados

1. A pauta possui renderizador modular e renderizador legado.
2. A Home oferece territórios, ferramentas, caminhos, ações, resultados e
   memória em trilhas paralelas.
3. O formulário geral de participação e as participações específicas não usam
   uma explicação comum de finalidade, visibilidade e retorno.
4. O miniapp Calçadas contém navegação própria; a volta à pauta existe em
   alguns fluxos, mas não estrutura toda a jornada.
5. “Minha área” e Caixa apresentam os registros corretamente, porém sem uma
   narrativa única de contribuição → análise → ação → resultado → memória.

## Páginas órfãs, invisibilidade e links

- prioridades, mobilização e resultados de Calçadas são encontráveis dentro do
  miniapp, mas pouco visíveis a partir da pauta;
- roda, síntese e módulos já existem no schema, mas dependem da configuração
  editorial para aparecer;
- Arte, Rádio e Acervo aceitam relações com pauta, porém surgem sobretudo como
  áreas independentes;
- a confirmação de registro já retorna à pauta e a “Minha participação”, sendo
  hoje o melhor exemplo de continuidade;
- não foi encontrada rota canônica quebrada no fluxo Calçadas; a principal
  falha é de descoberta e hierarquia.

## Estados e origem dos dados

- dados persistidos: pautas, módulos, rodas, rodadas, contribuições, sínteses,
  timeline, ações, resultados, registros de calçada, prioridades,
  encaminhamentos, protocolos, memórias, memberships e inbox;
- dados públicos são filtrados por visibilidade e estado editorial;
- originais, contatos, coordenadas exatas e object keys ficam fora das
  projeções públicas;
- fixtures locais existem e são identificadas como demonstração;
- alguns fallbacks editoriais e comunidades sintéticas ainda aparecem quando o
  banco não oferece conteúdo público.

## Divergências mobile/desktop

- a Home esconde blocos inteiros no mobile, criando narrativas diferentes;
- a pauta usa barra horizontal de módulos, mas não agrupa os módulos pelas
  etapas cognitivas do processo;
- o miniapp tem shell próprio e bottom navigation, enquanto a pauta usa outra
  hierarquia;
- alvos de toque são em geral adequados, mas há muitos links equivalentes e
  textos de ação pouco específicos.

## Schema reaproveitável

O Tijolo 42 pode ser atendido sem migration:

- `comun_pauta_spaces`: capa editorial, problema, demanda, síntese e próximo
  passo;
- `comun_pauta_modules`: composição do shell;
- `comun_construction_circles`, `comun_construction_circle_rounds`,
  `comun_circle_contributions`, `comun_circle_syntheses`: roda organizada;
- `comun_pauta_updates`, `comun_pauta_timeline_events`: continuidade;
- `comun_mobilization_actions`, `comun_hub_results`,
  `comun_sidewalk_forwardings`, `comun_official_protocols`: ação e resposta;
- `comun_sidewalk_records`, fotos públicas e projeções sanitizadas: evidências;
- `comun_pauta_memberships`, `comun_community_memberships`,
  `comun_member_inbox`: acompanhamento pessoal;
- relações de Acervo, Arte e Rádio com `pauta_id`: memória e expressão.

As mudanças recentes do Supabase sobre exposição automática de tabelas públicas
não exigem ação porque nenhuma tabela será criada. RLS e grants existentes
permanecem inalterados.

## Decisão da auditoria

Implementar uma camada de composição e linguagem sobre o schema existente:

1. um único modelo visual de pauta;
2. Calçadas como pauta piloto e miniapp contextual;
3. Home organizada por atenção, pauta, participação, resultado e memória;
4. uma chamada de participação com contrato explícito;
5. continuidade clara em confirmação, Minha Participação e Caixa;
6. observabilidade sanitizada no cliente, sem conteúdo ou identidade.

Migration: **não necessária**.
