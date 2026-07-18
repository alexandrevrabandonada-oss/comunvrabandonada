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

## Evidências concluídas

- Reset local completo: PASS, 53 migrations.
- Lint: PASS.
- Unitários: PASS, 203/203.
- O teste dedicado `test:e2e:editorial-pagination` foi criado, mas ainda não pôde concluir: o setup autenticado legado falhou ao localizar o campo de e-mail de uma persona após o reset, antes de rodar as asserções da fila.
- `typecheck` e `build` pós-E2E estão bloqueados por arquivos corrompidos em `.next/dev/types`, gerados pelo servidor de desenvolvimento concorrente. A remoção do diretório gerado foi bloqueada pela política local do executor; nenhum arquivo-fonte foi apontado como causa.

## Decisão

**NO-GO técnico temporário** até repetir E2E, Axe, visual, performance e build em uma sessão local com `.next` regenerado. Não foi criado índice: o índice existente cobre o caminho padrão e não há medição final que justifique outro.

Declarações: piloto público NÃO ABERTO; integração no principal NÃO EXECUTADA; push NÃO EXECUTADO; deploy NÃO EXECUTADO; Supabase remoto NÃO ALTERADO; R2 real NÃO UTILIZADO; serviços externos NÃO UTILIZADOS; dados reais NÃO UTILIZADOS; custo externo R$ 0.
