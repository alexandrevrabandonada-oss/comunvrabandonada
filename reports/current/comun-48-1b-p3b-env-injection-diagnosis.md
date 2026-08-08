# COMUN 48.1B-P3B-C4 — diagnóstico da injeção de ambiente

Data de referência: 2026-08-08

## Estado inicial

- baseline: `e964ed7596c620bf69bcb73c30593de3bec21b5f`;
- resultado anterior: `COMUN_P3B_BLOCKED_NEW_KEY_NOT_VISIBLE_TO_RUNTIME`;
- localização: desligada e cloaked;
- fotos privadas: ligadas;
- coletivos, mapa público, território, Google, Ônibus e forwarding: desligados;
- `launch_publicly=false`.

## Contrato do diagnóstico

O diagnóstico separa quatro provas: metadata da Vercel, valor efetivo via `vercel env run`, runtime do deployment Production sem domínio e runtime canônico. Nenhuma fixture pode ser criada antes das três primeiras provas verdes.

O probe temporário responde somente no hostname específico do deployment staged e retorna exclusivamente booleanos. O domínio canônico recebe `404`. Nenhum valor, fragmento, tamanho textual ou hash de segredo é registrado.

## Estado desta revisão

- testes focais: 3/3;
- typecheck: verde;
- lint: verde;
- build: verde;
- migration: nenhuma;
- mudança de schema: nenhuma;
- mudança de flag: nenhuma;
- fixture: nenhuma;
- deploy: pendente da lane sanitizada;
- resultado: `COMUN_P3B_ENV_DIAGNOSIS_IMPLEMENTED_STAGED_EXECUTION_PENDING`.

## Execução 31263803904

- metadata: `COMUN_P3B_VERCEL_ENV_METADATA_GREEN`;
- chave de localização: uma entrada Production, sem `gitBranch`, tipo `sensitive`;
- flag de localização: uma entrada Production, sem `gitBranch`;
- persistência e URL HTTPS: visíveis e válidas em `vercel env run`;
- chave de localização e service role: não legíveis em `vercel env run` por serem `sensitive`, cuja prova de valor é postergada ao runtime staged;
- flag: `disabled`, coerente com o rollback seguro anterior;
- deployment staged: não criado;
- fixture: não criada;
- escrita Supabase: nenhuma.

O workflow passa a atualizar a flag com `env update` e entrada sem newline apenas para formar o snapshot staged. Ao final, inclusive em falha, restaura a configuração da flag para `disabled`. A chave não é rotacionada nem lida.

## Execução 31264172214

- metadata: verde;
- ambiente legível via `env run`: verde;
- secrets sensíveis: deferidos ao staged runtime;
- deployment Production sem domínio: criado e pronto;
- probe do app: não alcançado porque Deployment Protection respondeu com redirecionamento SSO;
- fixture: não criada;
- flag restaurada para `disabled`: verde.

O acesso staged passa a usar `vercel curl`, mecanismo autenticado da plataforma que produz um bypass efêmero de Deployment Protection. Nenhum bypass secret novo é criado, lido ou armazenado.

## Execução 31264517323

- metadata: `COMUN_P3B_VERCEL_ENV_METADATA_GREEN`;
- ambiente legível: verde;
- chave e service role sensíveis: válidas no runtime staged;
- staged runtime: `COMUN_P3B_STAGED_RUNTIME_LOCATION_GATE_GREEN`;
- staged UI: `COMUN_P3B_STAGED_UI_LOCATION_GREEN`;
- capability coletiva: ausente;
- domínio canônico: não promovido;
- fixture: não criada;
- flag restaurada para `disabled`: verde.

O endpoint temporário foi removido antes da candidata de ativação. O runner canônico foi atualizado para usar `env update` sem newline ambíguo e exigir que `comunsocial.online` esteja associado ao deployment recém-criado antes de qualquer fixture.

## Execução 31266107357

- flag de localização: habilitada somente para a tentativa;
- deployment Production: criado e pronto;
- prova do alias: bloqueada antes da UI e da fixture;
- fixture: não criada;
- escrita Supabase: nenhuma;
- rollback automático: verde, com localização novamente desligada;
- recovery: chamado indevidamente sem `ATTEMPT_ID`, sem mutação, classificado como defeito do runner.

A prova consultava o campo resumido `alias` do objeto de deployment, que não é o contrato canônico de enumeração dos aliases associados. O runner passa a obter o identificador exato do deployment e consultar `GET /v2/deployments/{id}/aliases`, com espera limitada, exigindo `comunsocial.online` dentro da lista escopada àquele deployment. O recovery também passa a exigir que o marcador sintético tenha sido alocado com sucesso e seja não vazio.

## Execução 31266686216

- deployment Production: criado e pronto;
- API de aliases escopada: `comunsocial.online` ausente no deployment novo;
- UI e fixture: não executadas;
- recovery sem marcador: corretamente ignorado;
- rollback da flag: executado;
- escrita Supabase: nenhuma.

O projeto permanece em estado de promoção manual após os rollbacks anteriores. O runner passa a criar explicitamente um deployment Production sem domínio e, em etapa separada, usar `vercel promote` para torná-lo corrente. A mesma promoção explícita passa a proteger o deployment de rollback; a API de aliases continua sendo o gate exato antes da UI e da fixture.

## Execução 31266946949

- deployment Production: criado e pronto;
- promoção explícita: verde;
- validação do identificador: bloqueada antes da consulta de aliases por aceitar apenas o formato prefixado `dpl_`;
- UI e fixture: não executadas;
- recovery: ignorado por ausência de marcador;
- rollback explícito e promovido: verde;
- escrita Supabase: nenhuma.

O endpoint da Vercel devolveu o UID em formato base58 sem prefixo. O contrato foi corrigido para aceitar de forma fechada tanto `dpl_<base58>` quanto `<base58>`, ainda com tamanho limitado e sem publicar o identificador. A associação do domínio continua sendo comprovada apenas pela lista de aliases do deployment exato.

## Execução 31267331638

- deployment Production: criado e pronto;
- promoção explícita: verde;
- UID: reconhecido no formato base58;
- alias canônico: continuou ausente após a promoção;
- UI e fixture: não executadas;
- recovery: ignorado por ausência de marcador;
- rollback explícito: verde;
- escrita Supabase: nenhuma.

O projeto não reassocia automaticamente o custom domain mesmo após `vercel promote`, coerente com um estado de promoção manual pós-rollback. O runner passa a atribuir explicitamente apenas `comunsocial.online` ao deployment exato com `vercel alias set`; o rollback faz a mesma atribuição ao deployment flags-off. A mutação de alias permanece sujeita ao gate read-only da API escopada antes de qualquer UI ou fixture.

## Execução 31267635831

- deployment e promoção: verdes;
- atribuição explícita de `comunsocial.online`: verde;
- listagem reversa de aliases do deployment: não refletiu o custom domain;
- UI e fixture: não executadas;
- recovery: ignorado por ausência de marcador;
- rollback explícito: executado;
- escrita Supabase: nenhuma.

O contrato canônico precisa provar a relação na direção solicitada: domínio para deployment. A validação passa a consultar `GET /v4/aliases/comunsocial.online` e exige simultaneamente alias exato, project ID canônico e deployment ID exato, normalizando apenas o prefixo opcional `dpl_`. Nenhuma resposta bruta é registrada.

## Execução 31267912745

- deployment, promoção e atribuição do domínio: verdes;
- resolução pelo recurso Alias: divergente no contrato de representação;
- UI e fixture: não executadas;
- recovery: ignorado;
- rollback explícito: executado;
- escrita Supabase: nenhuma.

A prova final passa a resolver o próprio hostname pelo endpoint canônico de deployments: `GET /v13/deployments/comunsocial.online`. O gate exige que o deployment servido pertença ao project ID esperado e possua o mesmo UID do deployment recém-criado, normalizando somente o prefixo opcional `dpl_`.

## Execução 31268181636

- deployment, promoção e atribuição do domínio: verdes;
- resolução do hostname pelo endpoint de deployments: não aplicável ao custom alias;
- UI e fixture: não executadas;
- recovery: ignorado;
- rollback: verde;
- escrita Supabase: nenhuma.

Pelo schema OpenAPI oficial, `deploymentId` no recurso Alias é anulável e o identificador efetivo também pode aparecer em `deployment.id`. O gate volta ao recurso Alias, usa `deploymentId || deployment.id`, exige o alias e UID exatos e valida separadamente que o deployment alvo pertence ao project ID canônico.
