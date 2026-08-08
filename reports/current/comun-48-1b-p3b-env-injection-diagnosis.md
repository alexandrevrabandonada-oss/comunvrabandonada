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
