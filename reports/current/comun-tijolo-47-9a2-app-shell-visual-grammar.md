# Tijolo 47.9A2 — App Shell V2 e Gramática Visual

Atualizado em 1º de agosto de 2026. Este documento registra o candidato da PR
principal. A classificação terminal só pode ser confirmada depois de CI, merge
e Production no mesmo conteúdo.

## 1. Resultado

Classificação do candidato: `COMUN_APP_SHELL_VISUAL_SYSTEM_CANDIDATE_READY`.
Resultado-alvo pós-Production:
`COMUN_APP_SHELL_VISUAL_SYSTEM_READY_FOR_FLOW_REHEARSAL`.

Isso não conclui 47.9A nem 47.9D, não declara o sistema visual definitivo e não
aciona `launch_publicly`.

## 2. Base

A base observada no pedido, `47d0925a80b494f1fc60cb3a8709d275a8e71ff1`,
foi relida. Antes da implementação, `origin/main` já havia avançado para
`a2feb1dddccf3cd8cba145ea445110e87dcac95a`; essa é a base real do candidato.

## 3. Branch

`codex/tijolo-47-9a2-app-shell-visual-grammar`, criada em worktree isolado para
não tocar nas alterações alheias existentes no checkout original.

## 4. Candidate

O candidate é o HEAD da PR principal. O SHA é registrado no fechamento remoto.

## 5. PR

Uma única PR principal; número e URL são registrados após a publicação.

## 6. Merge

Pendente dos checks obrigatórios da PR principal.

## 7. Deployment

Pendente do merge. A saúde pública anterior foi relida; a verificação privada
do deployment exige as credenciais read-only do projeto Vercel e não foi
declarada como passe local.

## 8. Modos de shell

Contrato canônico executável: `public_web`, `member_root`, `member_nested`,
`admin`, `immersive`, `auth` e `institutional`. Cada modo fixa app bar, bottom
navigation, footer, largura, fundo, padding, retorno, safe area e scroll.

## 9. Rotas classificadas

189 páginas foram inventariadas: 1 `public_web`, 5 `member_root`, 72
`member_nested`, 88 `admin`, 13 `immersive`, 6 `auth` e 4 `institutional`. A
matriz completa está em `comun-tijolo-47-9a2-route-matrix.md` e deriva do
contrato, não de listas divergentes nos componentes.

## 10. Footer

O fallback preserva o rodapé existente. No V2, o rodapé institucional fica em
`public_web` e `institutional`; fica ausente em app de membro, auth, admin e
imersivo. Rodapé e bottom nav não coexistem no app mobile.

## 11. Bottom nav

Somente as cinco roots exibem Início, Explorar, Participar, Caixa e Minha área,
com rótulos, alvos mínimos, safe area, badge sanitizado, retorno ao topo no
segundo toque e memória de URL, filtro e scroll por aba.

## 12. App bar

Roots usam contexto compacto; nested tem voltar, título, contexto, ação
opcional e menu; admin tem linguagem operacional; imersivo preserva contexto.
O estado de conexão possui live region e o nome COMUN não é repetido como hero
em toda tarefa.

## 13. Safe areas

O V2 combina `100dvh`, `env(safe-area-inset-top)`,
`env(safe-area-inset-bottom)`, altura canônica das barras e
`VisualViewport.height`.

## 14. Scroll

Conteúdo root reserva o espaço integral da barra; inputs usam scroll margin;
teclado virtual recolhe a bottom nav; aba, scroll e filtros retornam pela chave
de sessão da própria root. O modo imersivo não ganha scroll documental falso.

## 15. Tokens

Foram criados `radius-control`, `radius-card`, `radius-community`,
`radius-cultural`, `radius-pill`, `stroke-subtle`, `stroke-strong`,
`elevation-action` e `elevation-floating`. Assimetria só ocorre pelos tokens
semânticos.

## 16. Superfícies

`surface-base`, `surface-paper`, `surface-community`, `surface-tool`,
`surface-action`, `surface-result`, `surface-memory`, `surface-alert` e
`surface-operation` têm contraste explícito, forced colors, impressão e
reduced transparency. Explorar diferencia categorias em vez de repetir papel
branco universal.

## 17. Tipografia

Escala fluida mobile/desktop e caixa normal para entidades, navegação,
descrições e tarefas. Caixa alta permanece em eyebrow, status, botões e avisos.

## 18. Cards

Componentes explícitos: `ComunCommunityCard`, `ComunMiniappCard`,
`ComunPautaCard`, `ComunActionCard`, `ComunResultCard` e `ComunMemoryCard`.
Comunidade e ferramenta têm anatomia, material, estado e CTA próprios; não são
wrappers genéricos intercambiáveis.

## 19. Home

No V2, o primeiro viewport contém saudação compacta, atenção, próxima ação,
atalhos e acompanhamentos. Não há feed nem personalização comportamental.

## 20. Explorar

Busca compacta, chips principais, painel avançado, filtro ativo e retorno
preservado. Os filtros continuam server-side; as categorias receberam materiais
semânticos e cards compactos.

## 21. Comunidades

O piloto remove painel rígido, tarja repetida e altura mínima excessiva. Cada
card combina emblema, propósito, território/tema, vínculo, próxima ação,
atividade e CTA em altura ditada pelo conteúdo.

## 22. Miniapps

O Mapa das Calçadas usa gramática de ferramenta: objetivo, território, estado,
funcionamento, impacto/progresso e CTA. A flag é preservada na navegação local.

## 23. Minha área

O V2 organiza contribuição, acompanhamentos, tarefas e resultados sem trazer o
rodapé institucional para a árvore autenticada. A versão anterior continua
disponível sem a flag.

## 24. Central

A Central Operacional V2 usa `surface-operation`, app bar e rail administrativos
próprios, sem bottom nav de membro nem footer. Dados e mutations permanecem no
fluxo administrativo existente.

## 25. Testes

- 399 unitários verdes;
- 35/35 E2E do App Shell V2 em cinco perfis;
- 9/9 regressões do shell mobile anterior em três viewports;
- contrato do shell com 18 testes focais;
- build de produção, typecheck, lint e `git diff --check` verdes;
- auditorias de qualidade: 1 teste Node e 4 testes Vitest verdes.

O transporte com Supabase local não iniciou porque `supabase status` ficou
preso no ambiente compartilhado; a mesma regressão passou no fallback local
determinístico. Nenhum passe autenticado dependente desse provider foi
inventado.

## 26. Acessibilidade

Foram executadas 25 varreduras Axe sem impacto sério/crítico, além de provas de
44×44, foco, teclado virtual, conteúdo não encoberto, overflow, reduced motion,
forced colors, 320 px, landscape e PWA standalone. Isso é automação, não ensaio
com tecnologia assistiva ou pessoa real.

## 27. Performance

O build Next 16.2.11 compilou em modo produção, com 94 páginas estáticas
geradas no conjunto. O gate herdado do 47.9C passou 9/9 perfis, de 320×568 a
1440×900, sem relaxar budgets. Métricas sintéticas de laboratório não
equivalem a campo.

## 28. Regressões

Nenhuma rota, mutation, deep link ou versão anterior foi removida. O harness
mobile legado agora respeita uma porta isolada. O provider local travado é uma
limitação do ambiente, não uma regressão promovida como verde.

## 29. Feature flag

O V2 só ativa com `?experiencia=app-v2`. Links internos dos pilotos propagam a
flag; removê-la restaura a árvore anterior. Não há migration ou dado remoto.

## 30. Riscos

- Central e Minha área ainda requerem ensaio autenticado com provider local ou
  Preview disponível;
- safe areas e teclado precisam de aparelhos reais;
- conteúdos muito longos e players fora dos pilotos usam o contrato, mas não
  foram redesenhados;
- 47.9B segue bloqueado por capability do provider;
- segurança segue bloqueada por redundância durável independente;
- `miniapps=in_progress` e `archive_radio_art=evidence_required` permanecem.

## 31. Roadmap atualizado

Sequência oficial: 47.9A2, 47.9A3, 47.9C, 47.9D, 47.10 e 47.11. Em paralelo:
47.8A, fechamento do provider 47.9B, Calçadas e conteúdo cultural real.

## 32. Próximo tijolo

`47.9A3 — Fluxos Centrais Streamlined`, sem antecipar o ensaio humano 47.9D e
sem promover 47.9A para GREEN.
