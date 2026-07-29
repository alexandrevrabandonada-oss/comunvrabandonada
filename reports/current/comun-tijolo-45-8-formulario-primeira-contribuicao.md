# Tijolo 45.8 — correção do formulário e contribuição controlada

Resultado terminal:
`COMUN_SIDEWALK_FORM_CORRECTED_CONTRIBUTION_BLOCKED_BEFORE_WRITE`

## Evidência e causa

- ciclo: `sidewalk-form-correction-first-contribution-20260729-08`
- main inicial: `5a74789a717d382a714ed7bbfe990882fcfa64dd`
- commit funcional: `5255ed764f64bb2a3f252836f8f254f1492ff131`
- PR funcional: [#73](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/73)
- merge: `c5def994a0094db63878297ce2a7a47f82a206e9`
- deployment Production observado: `github-deployment-5660866335` · `READY`

O predicado anterior exigia foto, ponto, confirmação do ponto, condição,
`sessionReady` e as duas confirmações editoriais. A escolha da foto iniciava
`signInAnonymously()` imediatamente. A inspeção controlada do runtime, sem
clicar no envio, comprovou resposta HTTP 422 com o código sanitizado
`anonymous_provider_disabled`. Por isso `sessionReady` permanecia falso e o
botão nunca podia ser habilitado.

O POST observado no ciclo anterior era exclusivamente o bootstrap de Supabase
Auth. A resposta recusou a operação antes de criar sessão; ele não carregava
bytes da imagem, não criava contribuição nem objeto de Storage e não persistiu
actor no caso observado.

## Correção integrada

A seleção da foto agora permanece totalmente local. O predicado de prontidão
usa somente requisitos visíveis. Quando foto, ponto, condição e confirmações
estão completos, o botão fica habilitado. A criação/reutilização da sessão foi
movida para depois do clique, com uma única chamada, erro explícito, sem retry
automático e com trava contra clique duplo.

Após o deployment do merge, o formulário foi novamente preenchido em
Production sem submissão:

- botão para payload válido: habilitado;
- erros de console: zero;
- requisições mutáveis antes do clique: zero;
- mapa e interface: HTTP 200;
- flag/runtime/estado público: `enabled` / `OPERATIONAL_READY` / `active`;
- banco alcançável, ledger exato e migration desnecessária.

## Parada antes da escrita

O backend mantém corretamente a exigência de sessão vinculada ao actor. O
provedor anônimo remoto continua desabilitado. Alterar configuração de Auth não
faz parte do envelope deste ciclo e não existe alternativa em código que
preserve autoria, limites e FKs sem mudança estrutural.

Assim, o defeito original do botão foi corrigido, mas a contribuição única não
foi iniciada. Não houve clique, retry, record, upload, escrita em banco ou
Storage. Migration, flag, ambiente, deployment e activation attempt 03
permaneceram inalterados.

## Testes

- focal: 6/6;
- unitários: 293/293;
- typecheck, lint, Prettier, build e `git diff --check`: verdes;
- hashes da migration e do manifesto canônicos: preservados.

## Próximo tijolo recomendado

Checkpoint separado para decidir e autorizar explicitamente a configuração do
provedor anônimo do Supabase, com inventário read-only anterior, proteção contra
actors órfãos e revalidação do formulário antes de uma nova contribuição única.
O ciclo anterior e este ciclo não podem ser reutilizados.
