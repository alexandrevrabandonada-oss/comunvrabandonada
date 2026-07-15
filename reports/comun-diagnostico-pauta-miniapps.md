# Diagnóstico pré-migração — Miniaplicativos de pauta

Data: 15/07/2026. Este diagnóstico precede a migration da Sprint 28.

## Estrutura reutilizável

- A página pública de pauta já reúne síntese, relatos sanitizados, evidências, tarefas, protocolos, linha do tempo, ações, resultados, projetos, dossiês e memória.
- `comun_pauta_spaces` é a raiz de pauta; ações, tarefas, evidências, resultados, território, observatórios e Acervo já têm vínculos próprios e não devem ser duplicados.
- Contribuições de pauta existentes são moderadas, com contato privado separado. A roda precisa de contribuição estrutural própria para preservar tipo, rodada e síntese, sem transformar a superfície em comentários genéricos.
- O admin de pauta já concentra curadoria; a composição deve ser um catálogo fechado, com configuração JSON validada no servidor.
- O shell atual é mobile-first e utiliza `ComunShell`/`Section`; o miniaplicativo pode reorganizar a mesma informação com navegação por módulo sem quebrar URLs.

## Lacuna

Não há registro de módulos, template seguro, roda/rodada, síntese com divergências ou associação comunitária por pauta. Também não existe uma superfície organizada de participação própria, apenas fluxos isolados.

## Decisão

Criar tabelas service-role only para composição, rodas, contribuições, sínteses, membros e memberships. O portal selecionará campos públicos de forma explícita. O catálogo será estático em código; nenhum administrador registra componente, HTML ou JavaScript. A primeira entrega manterá a página de pauta como URL raiz e acrescentará módulos como composição segura, reutilizando as consultas atuais.
