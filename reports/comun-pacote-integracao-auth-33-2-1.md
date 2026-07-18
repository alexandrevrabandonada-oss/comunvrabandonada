# Pacote de integração Auth (não aplicado)

Sequência sugerida em um worktree limpo do principal:

1. `git cherry-pick 7b7c19c ec32016 f57600c 4d14631 a70b371 28426fb 7c110e0 c1b5704 b141f4c`
2. `git cherry-pick c33297b a38e90a`
3. Aplicar o commit desta fase de performance e, por último, documentação.

Não executar no principal atual. Antes de cada passo, revisar conflitos em seed, package manifests, media-storage e `.env.example`; preservar hunks paralelos. Rollback local: `git cherry-pick --abort` durante aplicação ou `git revert <hash>` após commit, nunca reset destrutivo.
