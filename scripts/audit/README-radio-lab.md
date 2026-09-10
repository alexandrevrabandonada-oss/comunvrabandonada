# Reproduzir a auditoria de rádio, sem ambiente hospedado

Este harness usa o código do checkout atual, HTTP real, Auth real, Postgres real,
Storage real e FFmpeg. Não usa mocks. Os resultados só existem depois de executar
o harness; sua presença no pacote não significa integração aprovada.

## Pré-requisitos

- Node 22.19.0 e dependências instaladas com `npm ci --ignore-scripts` do lockfile.
- Docker Linux local (observado: Engine 29.2.1), com memória livre para a stack e
  Next/FFmpeg. A execução Windows de origem esgotou memória virtual durante o
  bootstrap: não tratar esse limite como falha das políticas RLS.
- Supabase CLI **2.117.0** disponível no cache de `npx --offline supabase`, ou
  caminho absoluto do executável dessa versão em `AUDIT_SUPABASE_BIN`. Este último
  evita o wrapper cmd no Windows. Não usar configuração de projeto hospedado.
- `ffmpeg` e `ffprobe` no PATH. `pg`, Supabase JS e SSR vêm das dependências do
  repositório. Não fornecer senhas/chaves externas.
- Portas 57430/31/32/33/34/37/39 e 8283 livres; aplicação em 3118.

## Execução

Em clone/worktree isolado, sem arquivos `.env*` além do exemplo rastreado:

```text
node scripts/audit/radio-lab.mjs prepare
node scripts/audit/radio-lab.mjs start
node scripts/audit/radio-lab-integration.mjs
node scripts/audit/radio-lab.mjs stop
```

Execute integração somente depois de `LAB_READY`. Se `start` falhar, interrompa
essa sequência, preserve o log e use `stop` para limpar apenas a stack registrada.
O comando `stop` também aceita a situação em que a CLI já removeu seus containers.
Nenhum comando faz link/db push/reset remoto, deploy, push Git ou dispatch.

O laboratório cria um identificador aleatório `audit_radio_*`, marcador local e
hash da configuração. Antes de escrever por SQL/SDK/HTTP, o harness confere esse
marcador, o label do container, o endpoint Docker local e as portas locais. A
configuração é derivada do `supabase/config.toml` de desenvolvimento; seeds ficam
desativados. Os ambientes de subprocessos usam uma allowlist de variáveis de SO,
sem herdar credenciais ou flags de projeto. A aplicação recebe apenas as chaves
geradas pela stack própria, mantidas em memória.

`radio-lab-migrations.json` enumera e fixa por SHA256 os 63 arquivos da cadeia
histórica até `20260723220112` e o perfil de buckets da rádio `20260730213205`.
Não usa `supabase/local-migrations`, nem as 110 migrations indiscriminadamente.
Na execução de origem essa cadeia foi percorrida sem erro SQL; o bootstrap
posterior dos serviços falhou por memória. Não foi adicionada migration nova.

## O que é exercitado

- A/editor, B/usuário comum, viewer e anônimo; identidade de cliente não concede
  papel editorial. Os editores existentes têm escopo editorial global: o harness
  não inventa um tenant por editor.
- Catálogos de grants/policies separados das negativas HTTP e Storage. Negativa
  por falta de GRANT não é prova de filtro RLS. A assinatura feita pelo cliente de
  serviço é explicitamente capacidade do provider, não um endpoint inexistente
  de autorização de assinatura na aplicação.
- URL de upload da aplicação, bytes WAV sintéticos no bucket privado, metadata
  real e confirmação; leitura/assinatura negadas a B/anônimo.
- Perda do corpo da resposta TCP após os headers, seguida de repetição.
- Timeout injetado somente depois de observar a transação bloqueada no banco,
  seguido de liberação e repetição em outra conexão.
- Confirmações em conexões HTTP independentes, bloqueadas simultaneamente por
  lock real no Postgres; a barreira depende de `pg_stat_activity`, não de sleep.
- Reuso de chave de idempotência com payload diferente. **O código existente
  não implementa esse contrato; o teste pode revelar FAIL. Não reduzir a assertion.**
- Falha SQL injetada após upload e depois de FFmpeg, com retomada. Triggers
  temporários têm nomes exclusivos e são removidos; não são migrations do produto.
- Duas requisições de processamento sincronizadas por lock no log administrativo;
  B continua bloqueado durante esse período. São requisições independentes para a
  aplicação e invocações FFmpeg, não certificação de múltiplas instâncias distribuídas.
- Persistência de MP3/waveform e ausência de publicação editorial automática;
  HTTP de episódio não publicado e limpeza por IDs/keys gerados na própria execução.

A estratégia atual delete+insert e a falta de uma chave idempotente persistida
continuam riscos a verificar. Não introduzir uma nova máquina de estados sem
uma reprodução concreta. O harness não presume atomicidade Postgres/Storage.
Também não certifica retirada/cache de conteúdo publicado ou R2 real. O fluxo
existente registra o asset antes de fornecer a URL de upload: a ordem inversa
"upload antes do primeiro registro" não existe nessa API. O harness testa a
falha depois do upload e antes da confirmação, que é o ponto real de retomada.

## Evidências e limites

`tmp/radio-integration-results.json` contém SHA e PASS/FAIL de cada caso executado.
Um erro de setup interrompe os casos dependentes: os ausentes são NOT_RUN, nunca
PASS. Preserve os logs privados de startup/app em `tmp/audit_radio_*`; não os
adicione ao Git, pois o bootstrap pode emitir material de autenticação efêmero.
O cleanup usa somente os IDs sintéticos guardados em memória e a stack de label
verificado. O restante do Docker, incluindo stacks locais preexistentes, fica fora
do laboratório. Se houver interrupção abrupta, `stop` remove a stack própria.

Verificações independentes de Docker:

```text
npm run test:unit -- --pool=threads --maxWorkers=1
npm run lint
npm run build
npm run typecheck
node --test scripts/ci/comun-central.node-test.mjs scripts/ci/vercel-build-impact.node-test.mjs
```

Neste host, o pool de forks esgotou memória; threads com um worker manteve todos
os casos e passou. Não executar build/typecheck simultaneamente, pois compartilham
tipos gerados. Não interpretar sucesso documental do PR #434 como prova deste pacote.
