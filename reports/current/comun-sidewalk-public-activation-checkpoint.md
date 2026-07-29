# Checkpoint técnico de prontidão para ativação pública das Calçadas

Resultado: `COMUN_SIDEWALK_PUBLIC_ACTIVATION_CHECKPOINT_READY_FLAG_DISABLED`

## Escopo

Este checkpoint validou somente por leitura se o sistema está tecnicamente
preparado para uma futura autorização de ativação pública. Ele não constitui
autorização, não criou attempt de ativação e não alterou ambiente, deployment,
banco, Storage, ledger ou estado público.

## Evidência

- checkpoint attempt: `sidewalk-public-activation-checkpoint-20260729-01`
- SHA de runtime avaliado: `5758a0bd05b54caba418b25d3e09149e19c21104`
- inventário operacional: run `30418704165`, success
- diagnóstico operacional protegido: run `30418705720`, success
- smoke protegido do deployment: run `30418707339`, success
- deployment Production do SHA avaliado: READY
- URL operacional do banco: presente em Production
- banco: reachable
- ledger: exact
- migration operacional necessária: false
- flag: disabled
- estado operacional: `FLAG_DISABLED`
- estado público: paused

Os artifacts de origem foram inspecionados depois do download. O inventário
persistiu somente nomes/targets allowlisted, sem valores. O diagnóstico
persistiu somente enums sanitizados. O scanner não encontrou conexão, token,
credencial, coordenada privada ou conteúdo de aplicação.

## Proteções verificadas

- o modo `activate` exige autorização humana exata;
- a autorização é vinculada ao SHA, ledger e a um
  `sidewalk-activate-YYYYMMDD-NN` novo;
- o attempt de configuração `sidewalk-db-env-20260729-02` não é aceito como
  attempt de ativação;
- GitHub Actions registra actor e timestamp do disparo;
- a autorização e o artifact terminal vinculam o commit;
- o monitor acompanha o deployment imutável e o alias público;
- o postflight exige scoped POST e ledger exato somente por leitura;
- `migrate` e `activate` são modos separados;
- falha de smoke aciona retorno ao estado pausado;
- concurrency inclui modo, SHA e attempt, evitando execuções simultâneas do
  mesmo attempt.

O controle de consumo do attempt permanece processual, registrado na COMUN
CENTRAL; não existe nonce remoto persistente. Isso é uma limitação conhecida,
mas não transforma este checkpoint em autorização e não permite ativação
acidental pela simples execução das leituras.

## Integridade operacional

- database writes: none
- Storage writes: none
- environment changed: false
- deployment created/promoted: false
- migration executed: false
- activate executed: false
- activation attempt 03: not created
- human authorization: absent

## Próximo gate permitido

«receber autorização humana explícita para preparar um novo prompt de ativação
pública, com novo attempt ID.»

Nenhuma ativação deve ser executada neste checkpoint.
