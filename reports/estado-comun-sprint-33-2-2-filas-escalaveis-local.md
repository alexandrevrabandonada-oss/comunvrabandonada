# Estado local — filas escaláveis (Sprint 33.2.2)

## Implementado no worktree isolado

- Contrato documentado em `docs/comun-experiencia-filas-operacionais.md`.
- Página padrão de 20 itens, teto explícito de 25 e paginação normalizada no servidor.
- Filtros de fila, status, prioridade, responsável, sem responsável, pauta, território, prazo, tipo e busca; URL é a fonte do estado.
- Ordenação estável com desempate por ID; padrão prioriza retiradas, vencidos, prioridade, prazo e criação.
- RPC `list_comun_operational_items` retorna apenas a página, total filtrado, total geral e contadores agregados; não há consulta por card nem campos privados/originais.
- Detalhe aceita somente `returnTo` interno da central e retorna ao mesmo recorte.
- Cards, painel móvel expansível, chips e estados vazios foram implementados.
- Factory de carga materializa prazo, tipo e itens sem responsável, todos sintéticos e locais.
- Setup dedicado da paginação usa somente `operations_admin`, com login real, cookie e storageState validados em novo contexto. Emite `COMUN_EDITORIAL_PAGINATION_AUTH_READY`.
- A validação usa a porta 3102 e `distDir` interno exclusivo (`.next-s33-2-2-pagination`), evitando concorrência com `.next`.
- Corrigidos o contexto da chamada `db.rpc` e a expressão inválida de busca SQL; a RPC continua com `SECURITY INVOKER`, `search_path` explícito e execução restrita a `service_role`.

## Evidências concluídas

- Reset local completo: PASS, 53 migrations.
- Lint: PASS.
- Unitários: PASS, 203/203.
- E2E autenticado de paginação: PASS, 2/2. Exercita 100 itens sintéticos, primeira e segunda páginas, sem responsável, busca, retorno do detalhe e mobile.
- E2E autenticado de paginação e acesso negativo: PASS, 3/3. O setup cria somente `operations_admin` e `participant`; ambos usam e-mails exclusivos, storage states separados e cleanup por runId. Participante e visitante recebem somente redirect seguro, sem HTML parcial da central, cards ou dados da fila.
- Axe autenticado: PASS, zero violações serious/critical na central e no painel móvel de filtros. O contraste de texto/controles foi corrigido.
- Lint, typecheck e build: PASS em `distDir` isolado (`.next-s33-2-2-build`).

## Decisão

**NO-GO técnico temporário**: os gates básicos de Auth, E2E, Axe, lint, typecheck e build estão verdes, mas permanecem pendentes cobertura ampliada de filtros/negação, revisão visual completa, performance 25/50/100, reset duplo, production-like, regressões e validação em terceiro worktree. Não foi criado índice: o índice existente cobre o caminho padrão e não há medição final que justifique outro.

Declarações: piloto público NÃO ABERTO; integração no principal NÃO EXECUTADA; push NÃO EXECUTADO; deploy NÃO EXECUTADO; Supabase remoto NÃO ALTERADO; R2 real NÃO UTILIZADO; serviços externos NÃO UTILIZADOS; dados reais NÃO UTILIZADOS; custo externo R$ 0.
