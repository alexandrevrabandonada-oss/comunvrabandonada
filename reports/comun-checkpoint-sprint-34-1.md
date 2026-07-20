# Checkpoint — Sprint 34.1

Data: 19/07/2026. Escopo exclusivamente local.

## Git e isolamento

- Branch: `codex/comun-experiencia-integral-local`
- HEAD inicial: `4e221f0` (`feat: integra experiencia publica do comun`)
- Worktree: `C:\Projetos\comun-experiencia-integral-local`
- Status inicial: limpo
- Base documentada: `46b940d`
- Outros worktrees: não modificados

## Superfícies encontradas

| Área | Estado no checkpoint |
| --- | --- |
| Shell | cinco destinos principais, folha Participar e busca |
| Home pública | reorganizada na Sprint 34; visitante E2E 15/15 |
| Login | Supabase Auth local, e-mail/senha, `returnTo` aceito sem contrato compartilhado |
| Cadastro | conta e perfil mínimo; sempre redireciona para `/comun/onboarding` e perde `returnTo` |
| Retorno | função local em `app/actions.ts`; aceita `/comun/*`, rejeita `/comun/admin*`, mas não normaliza URL codificada nem preserva o destino durante onboarding |
| Onboarding | formulário único de perfil, bio e visibilidade; não é progressivo nem contextual |
| Comunidades | índice público e detalhe em `/comun/c/[slug]`; detalhe privilegia dossiês e relatos antes de próxima ação |
| Minha área | protegida; reúne inbox, pautas, ações, tarefas, rodas, resultados e contribuições, ainda sem prioridade transversal |
| Caixa de entrada | protegida e contextual, sem mecanismo de popularidade |
| Pautas | processo público com acompanhamento autenticado existente |
| Calçadas | vertical local e fixtures já documentadas nas Sprints 32–32.1 |
| Busca | pública, por correspondência editorial e origem, sem ranking de popularidade |
| Participar | catálogo público e interesse genérico; folha global ainda não recebe contexto da rota |

## Dados, fixtures e testes

- Perfis comunitários usam `comun_member_profiles`; não será criada migration de domínio nesta Sprint.
- Preferências progressivas poderão ser mantidas localmente sem conteúdo sensível e concluídas no perfil mínimo já existente.
- Fixtures locais de Auth e do piloto de calçadas já existem; não contêm dados reais.
- Suíte vigente: `npm run test:e2e:comun-integral-experience`, 15/15 no marco inicial.
- Regressão integral 31–34 ainda pendente no checkpoint.

## Processos preservados

- exploração pública continua sem cadastro;
- infraestrutura Auth não será substituída;
- admin, scheduler, filas, secrets, Supabase remoto e R2 permanecem fora do escopo;
- custo externo obrigatório: R$ 0.
