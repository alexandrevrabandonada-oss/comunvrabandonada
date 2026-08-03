# COMUN — Tijolo 48.0A — Diagnóstico do COMUN Relata

Atualizado em 3 de agosto de 2026. Este diagnóstico foi produzido antes de qualquer patch de produto.

## Baseline e limites

- `origin/main`: `d14f1aed1eca46b330b661935e6c73122390e708`;
- baseline esperado: `d14f1aed1eca46b330b661935e6c73122390e708`;
- verificação: `git fetch --all --prune`, igualdade de SHA e ancestralidade aprovadas;
- Production: `https://comunsocial.online`;
- deployment informado/checado por endpoint de qualidade: SHA exato do baseline;
- PWA: `comun-pwa-v3`;
- App V2: canônico sem query; rollback legado preservado em `?experiencia=legacy`;
- `launch_publicly`: não acionado;
- escopo: fundação local, sem migration, sem escrita remota, sem segredo e sem integração oficial.

Não houve drift de baseline. O trabalho segue em branch isolada e não altera o worktree legado do operador.

## Shell e rotas existentes

O contrato canônico em `lib/comun-shell-contract.ts` já define sete modos: `public_web`, `member_root`, `member_nested`, `admin`, `immersive`, `auth` e `institutional`. O contrato também separa rodapé institucional, navegação inferior, largura, fundo, padding, retorno, safe area e scroll. O App V2 continua resolvido pela infraestrutura existente (`lib/comun-experience.ts`, `proxy.ts` e `ComunShell`), sem mudança de default neste tijolo.

As rotas `/comun` e as cinco raízes de membro usam a matriz de navegação existente; detalhes, formulários, mapas e players são resolvidos por `resolveComunSurfaceMigration`. A área administrativa usa contrato próprio, sem bottom navigation de membro. O novo `/comun/relata` ainda não participa da matriz pública, sitemap ou navegação.

## Relato legado observado

`app/comun/relatar/page.tsx` e `app/actions.ts` formam um fluxo anterior de manifestação. Ele valida formulário, grava em `comun_reports`, pode enviar foto para Storage e produz protocolo no Supabase. `lib/reports.ts` e `lib/official-channels.ts` também dependem de dados/canais reais. Esse fluxo permanece intacto para rollback e compatibilidade; não será reutilizado pelo COMUN Relata, porque a fundação 48.0A exige somente preview local, sem escrita ou envio oficial.

## Padrões reutilizáveis

- tipos e contratos: `lib/types.ts`, `lib/comun-shell-contract.ts`, `lib/comun-surface-migration.ts`;
- experiência e proteção de rota: `lib/comun-experience.ts` e `proxy.ts`;
- sanitização de auditoria: `lib/admin-audit.ts` remove texto bruto, contatos, coordenadas exatas, tokens, URLs assinadas e caminhos privados;
- proteção de localização/anexos: o fluxo legado mantém localização aproximada e original privado, mas é remoto e não é dependência do preview;
- testes: Vitest para regras puras, Playwright para E2E/viewport e `@axe-core/playwright` para acessibilidade;
- qualidade: `typecheck`, `lint`, `build`, smoke público, no-leak e scripts de experiência já existentes.

## Lacunas que o patch endereça

1. Não existe ainda um contrato puro para Report/Case/Agency/Channel/RoutingDecision e demais entidades do Relata.
2. Não existe um registro de canais futuros explicitamente fictício/não verificado.
3. Não existe roteamento determinístico que diferencie iluminação pública, distribuição de energia, risco elétrico, emergência e fumaça sem fogo ativo.
4. Não existe classificação de privacidade independente de Supabase nem contrato de localização privada versus projeção pública.
5. Não existe a rota protegida `/comun/relata` com triagem de até três perguntas e preview de protocolo COMUN não oficial.
6. Não existe cobertura focal para flag fail-closed, ausência de navegação pública, pergunta de desambiguação, no-leak de logs e Axe.

## Decisão de implementação

Adicionar módulos puros `lib/comun-relata-*`, um catálogo de fixtures não verificados, UI isolada em `/comun/relata` e testes focais. A flag `COMUN_RELATA_PREVIEW=enabled` ficará desligada por padrão; sem ela a rota responde como indisponível e nenhum link, metadata, sitemap ou chamada remota será introduzido. Nenhuma mutation canônica, migration, domínio, PWA ou integração oficial será alterada.

## Critério de saída da etapa DIAG

O baseline está confirmado, os pontos de integração e riscos estão registrados e o patch pode avançar para PLAN/PATCH mantendo o Relata dormente por padrão.
