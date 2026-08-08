# COMUN 48.1B-P3B — smoke Production

## Execução

- deploy flags-off: verde (`3bbo4Eb1xHWoGtBjE8HSeaTnNBys`);
- chave `COMUN_RELATA_LOCATION_ENCRYPTION_KEY`: configurada somente server-side, sem registro do valor;
- ativação isolada: deploy `GogUrPo1rttC8JMbunc7hnPX7CuV`, interface mostrou localização e manteve foto ativa;
- localização e agrupamento ficaram separados; coletivos continuaram desligados;
- rollback preventivo: `COMUN_RELATA_LOCATION_ENABLED=disabled`, deploy `ExP2KBCQg6zSBKZhvyduEARTGW2Z`;
- smoke final: `/comun/relatar=200`, foto presente, localização 404, endpoint temporário removido/404.

Um ensaio sintético criou um relato e adicionou uma localização, mas uma asserção incorreta interrompeu o bloco de limpeza antes da retirada. Não houve exposição de coordenada na resposta. O cleanup posterior não pôde ser comprovado: o acesso server-side via REST não expõe `private` e o MCP continua sem permissão. Por segurança, a flag foi desligada e nenhuma nova fixture foi criada.

## C2 — F1 e reativação controlada

- cleanup read-only verde no run `31239240233`;
- F1 promovida e postflight verde no run `31243106898`;
- PR #195 integrou o workflow de reativação e smoke recuperável;
- runs `31243464452` e `31243680359` identificaram falha do harness antes da
  localização (triagem e marcador corrigidos nos PRs #196 e #197);
- run `31244362809` confirmou que os nomes das variáveis server-side existem,
  mas o POST de localização continuou `404` após redeploy;
- rollback seguro no run `31244127100`; o smoke read-only atual mantém
  `/api/comun/relata/evidence/location=404`.

Nenhum valor de chave foi lido ou registrado. A validade criptográfica da chave
atual não foi comprovada e a localização não foi reativada.

Resultado: `COMUN_P3B_BLOCKED_LOCATION_RUNTIME_KEY_INVALID_OR_UNAVAILABLE`.

## C3 — rotação e bloqueio antes da fixture

- A chave foi gerada somente no runner e configurada diretamente como variável
  Production sensível; seu valor, hash e fragmentos nunca foram lidos ou
  registrados.
- O run `31260049930` falhou apenas no checkout por SHA inexistente no runner.
  O runner foi corrigido sem relaxar a validação exata.
- O run `31260199454` completou rotação, flag e redeploy, mas o gate de UI não
  encontrou localização; rollback automático concluído.
- O run `31260510529` foi cancelado durante polling sem fixture; rollback
  automático concluído.
- O run `31260965396` novamente não encontrou a capacidade de localização;
  rollback automático concluído.
- O run `31261385771` usou o runner final com timeout curto e também bloqueou
  antes da fixture; rollback automático concluído.
- Nenhum POST de Relata, location, receipt ou cleanup foi executado nesses
  quatro runs; não há dado sintético novo nem envio externo.

Resultado C3: `COMUN_P3B_BLOCKED_NEW_KEY_NOT_VISIBLE_TO_RUNTIME`.
