# Tijolo 45.3K — diagnóstico terminal da ativação

- Run consumido: `30348219144`
- SHA: `04ff13d45f624dd0109a9587a59e12e31092b0ad`
- Attempt: consumido; não reutilizável.
- Conclusão do job de ativação: `failure`.
- Duração observada: 524 segundos.

## Sequência sanitizada

- A autorização e o postflight somente leitura foram concluídos antes do job
  `activate`.
- O check run não publicou `title`, `summary` nem `text`.
- O log continha apenas referências do próprio script aos markers; essas
  referências foram excluídas como evidência de runtime.
- O único dado terminal recuperável é `exit status=1`.

## Classificação

- Última fase verde no job `activate`: não comprovável.
- Última verificação verde antes dele: postflight somente leitura, com POST
  escopado e ledger aceitos.
- Primeiro marker vermelho: não publicado.
- Fase original classificada: `MONITOR_FAILED_UNKNOWN_SUBPHASE`.

Essa é uma classificação fail-closed da ausência de telemetria: ela não afirma
falha de flag, criação de deployment, URL, readiness, alias ou smoke. Não há
evidência suficiente para uma subfase mais específica.

## Rollback e estado público

- Execução do rollback interno: não comprovável pelo job consumido.
- Resultado público observado depois da falha: `paused`.
- Home, mapa e contribuição responderam HTTP 200; a contribuição permaneceu
  pausada.
- Migration e ledger permaneceram inalterados; escritas em banco e Storage:
  `none`.

## Correção recomendada e aplicada

A causa corrigível comprovada é a ausência de evidência terminal publicada.
As próximas ativações passam a registrar uma sequência mínima sanitizada, um
único marker terminal, artifact obrigatório e verificação pública de pausa em
falha. A autorização passa a exigir um `activation_attempt_id` único.

Nenhuma alteração de flag, migration, ledger, banco, Storage ou deployment foi
executada neste diagnóstico.
