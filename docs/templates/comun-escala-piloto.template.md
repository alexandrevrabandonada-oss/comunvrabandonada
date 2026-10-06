# Escala do piloto — preencher por decisão humana

Para cada função crítica registre apenas: papel, titular confirmado, substituto confirmado, janela de cobertura confirmada, treinamento, acesso revisado, data e pessoa que confirmou. Não inclua telefone ou contato pessoal desnecessário. Funções: coordenação, contribuições, privacidade, direitos, facilitação, protocolo, resultados e suporte técnico.

Para a checagem local, use uma lista JSON com exatamente uma linha por código:
`coordenacao`, `contribuicoes`, `privacidade`, `direitos`, `facilitacao`,
`protocolo`, `resultados` e `suporte_tecnico`. Os rótulos da tabela de escala
também são aceitos. Cada linha contém `role`, `primary_confirmed`,
`substitute_confirmed`, `coverage_window_confirmed`,
`escalation_channel_confirmed`, `training_confirmed`, `access_reviewed`,
`confirmed_at` e `confirmed_by`.

As seis confirmações são booleanos e só recebem `true` após confirmação humana.
Inclua a confirmação do canal de escalonamento. A data aceita `AAAA-MM-DD` ou
timestamp ISO com fuso explícito e deve existir no calendário e não estar no
futuro. `confirmed_by` identifica quem confirmou, sem valores vazios ou
marcadores como TODO, TBD, pendente ou a definir. Mantenha as declarações em
`.local/comun/pilot-human-readiness.json`, fora do Git; os comandos imprimem
apenas o estado, sem dados das pessoas.
