# Roteiro de revisão humana da experiência

Executar somente no ambiente local com fixture sintética. A pessoa revisora deve: explicar o COMUN com suas palavras; encontrar uma comunidade; abrir a pauta das calçadas; iniciar participação; criar conta; completar onboarding mínimo; enviar JPEG e ponto fixtures; localizar o registro em Minha área; voltar à pauta; explicar revisão, resultado e memória.

Registrar literalmente: dúvidas, palavras confusas, ações não encontradas, etapas desnecessárias, expectativas incorretas e simplificações sugeridas. Não converter execução automatizada em aprovação humana.

Crie cada registro com `node scripts/human-gate/create-session.mjs
--output=<arquivo-local>`. O template começa sem consentimento e sem conclusão;
esses campos só devem ser confirmados a partir da sessão humana real. Preserve
`schemaVersion: 1` e o `sessionId` gerado. Registre data, dispositivo, tarefas
e observações em arquivos privados fora do Git.

O resumo `node scripts/human-gate/summarize-session.mjs <sessao-1> <sessao-2>
<sessao-3>` exige três IDs distintos, consentimento e conclusão declarados,
ao menos uma tarefa por registro e, para cada tarefa, `success` booleano e
`seconds` numérico, finito e não negativo. Categoria ausente entra em
`unclassified`; categoria preenchida é um rótulo funcional, sem dados pessoais.
Tempo ausente não é zero: ele bloqueia o relatório inteiro. Arquivo inválido
ou evidência incompleta produz apenas um marcador sanitizado e erro, sem
resumo parcial, notas privadas ou IDs no stdout.

O resumo agrega os registros declarados e não verifica a independência dos
participantes, a realização das sessões ou a validade do consentimento. Esses
aspectos exigem revisão humana da evidência privada. Nenhum resultado do
script promove o gate público. Os testes automatizados usam arquivos
sintéticos temporários e não contam como sessões humanas.
