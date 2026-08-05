# COMUN — 48.1A · plano de promoção controlada

Estado atual: não executável até o acesso read-only ao projeto correto ser
restaurado. O merge dormente do 48.0M foi concluído; a branch 48.1A contém
somente o hardening de cloak e documentação.

1. Merge do 48.0M dormente e smoke read-only.
2. Preflight remoto somente leitura e export sanitizado.
3. Comparar checksums exatos e dependências; rejeitar drift.
4. Criar checkpoint/backup lógico sem PII e validar restore.
5. Promover somente o conjunto core allowlisted, em transação, se o contrato
   remoto permitir; não promover Ônibus/STMU/encaminhamento nesta fase.
6. Inserir allowlist por identificador opaco do proprietário, sem e-mail.
7. Ativar apenas a flag local/allowlisted; manter `launch_publicly=false`.
8. Executar cinco jornadas do proprietário, métricas em faixas e rollback.

Nenhum passo 2–8 foi promovido remotamente nesta execução.

Rollback: desativar allowlist/flag, reverter código para o SHA funcional
anterior e preservar dados; não apagar relatos, carteiras ou eventos.
