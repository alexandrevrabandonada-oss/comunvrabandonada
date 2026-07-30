# Tijolo 47.4 — esteira política completa

Estado deste relatório: evidência local concluída; promoção remota será
registrada após os gates do SHA candidato.

## Base e diagnóstico

- PR #94 integrada por merge commit
  `881c3bda42ff0bea8c882d2735cc4584c8c86de5`.
- Branch: `codex/tijolo-47-4-esteira-politica-completa`.
- Inventário remoto inicial: somente leitura; zero escrita.
- Ações Coletivas dos Tijolos 44–44.3: ausentes no remoto no diagnóstico.
- Pautas, contribuições, sínteses, rodas, protocolos, resultados, comunidades e
  Inbox: presentes e reutilizados.

## Decisão de arquitetura

Não foi criado outro sistema de mobilização. A migration aditiva acrescenta
somente decisão, ciclo e eventos, ligando:

`contribuição → moderação → roda → síntese → decisão → ação → tarefa → encaminhamento → protocolo → resposta → resultado → memória`.

As fontes canônicas e a matriz de lacunas estão em
`docs/comun-fluxo-pauta-acao.md`.

## Evidências locais

- máquina de estados: verde;
- matriz positiva e negativa: verde;
- idempotência e conflito de versão: verdes;
- schema completo em Supabase descartável: verde;
- 11 objetos esperados com RLS: verdes;
- Ações Coletivas — jornada do membro e memória administrativa: verdes;
- matriz RLS global: `RLS_MATRIX_OK`;
- ensaio autenticado privado: 12 transições verdes;
- transição negativa: bloqueada;
- atividade separada de resultado: comprovada;
- projeção pública por RLS: verde, sem nota privada;
- rollback transacional: concluído;
- linhas sintéticas após postflight: zero;
- protocolo externo real: não enviado;
- banco remoto e Storage remoto: zero escrita durante o diagnóstico.

## Promoção controlada

Os modos são separados:

- `preflight`: somente leitura;
- `migrate`: migrations aditivas exatas, após dry-run;
- `rehearse`: dados sintéticos privados em transação revertida;
- `activate`: exige ensaio verde do mesmo SHA e altera somente
  `COMUN_COLLECTIVE_ACTIONS_V1`.

O gate `launch_publicly` não faz parte deste tijolo.

## Resultado

Antes da evidência remota objetiva, o resultado honesto permanece:

`COMUN_PAUTA_ACTION_CYCLE_READY_FOR_CONTROLLED_REHEARSAL`

Ele só será promovido a `COMUN_PAUTA_ACTION_CYCLE_GREEN` depois de schema/RLS
remotos, ensaio autenticado, postflight e ativação controlada verdes.
