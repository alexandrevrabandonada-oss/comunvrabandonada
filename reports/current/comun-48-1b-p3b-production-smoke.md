# COMUN 48.1B-P3B — smoke Production

## Execução

- deploy flags-off: verde (`3bbo4Eb1xHWoGtBjE8HSeaTnNBys`);
- chave `COMUN_RELATA_LOCATION_ENCRYPTION_KEY`: configurada somente server-side, sem registro do valor;
- ativação isolada: deploy `GogUrPo1rttC8JMbunc7hnPX7CuV`, interface mostrou localização e manteve foto ativa;
- localização e agrupamento ficaram separados; coletivos continuaram desligados;
- rollback preventivo: `COMUN_RELATA_LOCATION_ENABLED=disabled`, deploy `ExP2KBCQg6zSBKZhvyduEARTGW2Z`;
- smoke final: `/comun/relatar=200`, foto presente, localização 404, endpoint temporário removido/404.

Um ensaio sintético criou um relato e adicionou uma localização, mas uma asserção incorreta interrompeu o bloco de limpeza antes da retirada. Não houve exposição de coordenada na resposta. O cleanup posterior não pôde ser comprovado: o acesso server-side via REST não expõe `private` e o MCP continua sem permissão. Por segurança, a flag foi desligada e nenhuma nova fixture foi criada.

Estado atual: localização `404`/desligada. Nenhuma chave foi registrada em Git, relatório, artifact ou variável pública. O resultado terminal P3B permanece bloqueado até a retirada exata da fixture e a prova de zero estado ativo.
