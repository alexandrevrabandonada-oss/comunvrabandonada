# COMUN 48.1B-P6C-A — SUS privado e seguro

Atualizado em 10/08/2026.

## Estado do piloto

48.1C não foi concluído nem reiniciado. A decisão de produto permanece:

`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Nenhuma métrica humana foi declarada atingida. P6C-B e P6C-C não foram
iniciados.

## Escopo entregue

O Relata único em `/comun/relatar` reconhece problemas nos serviços públicos
de saúde sem criar miniapp ou intake paralelo. O roteador composável
`comun-health-service-routing-v1` preserva os roteadores ambientais e urbanos
e produz `category=public_health` com subtipo privado, confiança, urgência,
revisão humana e classe de privacidade.

Os subtipos privados entregues são atendimento/demora, exame/procedimento,
medicamento/insumo, falta de profissional/serviço, estrutura/acessibilidade,
conduta, transferência/transporte sanitário, informação/acompanhamento e
outro problema no SUS. A interface usa somente labels humanos e nunca mostra
enum, confiança numérica ou sinais internos.

O COMUN classifica o problema do serviço e não diagnostica sintomas, doença,
gravidade clínica, tratamento ou prognóstico. A pergunta de tipo é tipada,
opcional e não bloqueia Guardar. Nome de unidade também é opcional e recebe
orientação para não incluir paciente, documento, diagnóstico ou prontuário.

Texto válido ou foto privada continuam suficientes para guardar. Foto-only
permanece `original_text=NULL` e `category=other`, sem visão computacional ou
inferência de saúde. Enriquecimento semântico posterior preserva report, case,
protocolo e item de Carteira.

## Privacidade e segurança

Todo `public_health` é no mínimo `sensitive`; sinais clínicos, identificáveis
ou relacionados a pessoa vulnerável elevam para `high_risk`. A migration e o
runtime exigem publicação `never`. Saúde não é candidata automática a mapa,
snapshot, busca pública, coletivo ou observatório bruto.

A Carteira mostra “Saúde pública”, estado e subtipo humano quando disponível,
sem texto integral, paciente, unidade, localização, foto ou documento. Nenhum
Fiscaliza, STMU, SAAE, Light ou adapter institucional é usado como fallback.

Urgência clínica é separada de ouvidoria. Quando há risco imediato, a UI
orienta procurar atendimento e informa que o SAMU 192 é o canal emergencial,
mas o COMUN não liga, não envia dados e não afirma que o serviço foi acionado.

## Preflight, drift comprovado e migration autorizada

O preflight remoto leu somente metadata/schema e confirmou `public_health` e
`public_education` existentes, RPCs, transition, routing decision, RLS/FORCE
RLS, grants, Carteira fail-closed, forwarding source domains e histórico de
migrations. Nenhum conteúdo de relato foi lido.

A expectativa inicial era plano `[]`. O primeiro E2E descartável comprovou
que o RPC remoto rejeitava a nova versão de routing e não preservava o subtipo
privado. O trabalho parou com `COMUN_P6C_A_BLOCKED_REMOTE_SCHEMA_DRIFT`; a
responsável autorizou explicitamente uma única migration estreita antes da
continuação.

Foi promovida exatamente uma migration forward-only:

- `20260810143000_comun_public_health_sensitive_routing.sql`;
- SHA-256
  `6bcf50652b436a66ce110ef90a66e09249663c35055514d6e506f88054938d4f`;
- amplia somente os contratos server-side existentes de criação e transition;
- valida routing version, subtipo, privacidade e publicação `never`;
- permite enriquecimento photo-only para saúde pelo roteador do servidor;
- preserva report, case, protocolo e Carteira com evento append-only;
- reasserta execução somente para `service_role`;
- sem tabela, categoria pública, source domain, package, backfill, leitura de
  negócio, reclassificação histórica ou hard delete.

O dry-run remoto do run `31401299502` listou somente essa migration. A exceção
histórica de Calçadas foi reconciliada pelo procedimento vigente; não foram
usados `--include-all`, migration repair, reset ou seed.

O postflight sanitizado comprovou migration aplicada, routing version e
subtipo aceitos, transition aceita, RLS/FORCE RLS em cases/reports, execução
negada para `anon` e `authenticated`, permitida para `service_role` e
`businessRowsRead=false`.

O Docker local não estava disponível para tornar o Supabase descartável local
na prova autoritativa. O E2E, o plano exato e a migration recovery foram
executados em runners descartáveis do GitHub Actions; Production não foi usada
como laboratório.

## Catálogo institucional

As fontes foram revalidadas em 10/08/2026 somente em páginas oficiais, sem
ligação, mensagem, formulário, login ou teste operacional:

- Ouvidoria SUS municipal, Carta de Serviços 302:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/302/`;
- referência municipal conflitante, Carta de Serviços 572:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/572/`;
- participação social/Ouvidoria SES-RJ:
  `https://www.rj.gov.br/saude/participacao-social`;
- OuvERJ: `https://www.rj.gov.br/ouverj/`;
- limitações oficiais de anonimato/sigilo nas ouvidorias SUS do RJ:
  `https://www.saude.rj.gov.br/ouvidoria/como-registrar-manifestacoes-em-ouvidorias-do-sus-pela-internet`;
- Ouvidoria-Geral do SUS — OuvSUS:
  `https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus`;
- SAMU 192:
  `https://www.gov.br/saude/pt-br/composicao/saes/samu-192`.

As Cartas municipais 302 e 572 divergem sobre identificação e prazo; o canal
municipal foi marcado `conflicting_sources`, sem escolha silenciosa. SES-RJ,
OuvERJ, OuvSUS e SAMU estão `source_verified`. Todos permanecem
`operationally_unchecked` e `automationAllowed=false`.

O catálogo é server-side, versionado e fora do SQL. A pessoa pode consultar
os canais depois de guardar, mas nenhum texto, foto, unidade, condição,
localização ou contato é copiado para eles. SAMU aparece somente como
orientação emergencial.

## Verificação e merge funcional

- PR funcional `#258`;
- head final exato `3737f217171c2003147f3ee4a9b81f16d6ce8aa3`;
- merge exact-head `5f016adfd12d08e7a2f89f515b64387be5a80f86`;
- 179 check-runs concluídos: 37 sucessos e 142 skips esperados, zero falha,
  zero pendência e zero review thread;
- Vercel Preview READY;
- 139 arquivos e 660 testes locais verdes, além de testes focais, typecheck,
  lint e build;
- F1, F2, S1, S3, P3, P4, P5, P6A, P6B-A, P6B-B, Google Auth, Wallet,
  RLS/grants, Security, no-leak, accessibility, Core Journeys e Quality
  verdes;
- E2E descartável:
  `COMUN_P6C_A_SUS_PRIVATE_DISPOSABLE_E2E_GREEN`.

O E2E comprovou os subtipos, privacidade sensitive/high-risk, urgência sem
chamada, photo-only sem inferência, enriquecimento no mesmo protocolo,
receipt inválido negado, outra Carteira isolada, categoria não forjável, zero
forwarding, zero request externo, zero snapshot, zero coletivo e zero hard
delete.

## Production

O exact main `5f016adfd12d08e7a2f89f515b64387be5a80f86` foi promovido no run
`31401299502`. A migration, o postflight e o deploy flags-OFF passaram. O
deployment intermediário foi:

`https://comunvrabandonada-h5oi24xzi-alexandrevrabandonada-oss-projects.vercel.app`.

Em seguida, a onda 1 `31401563130` ativou somente:

`COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_ENABLED=enabled`.

Permanece forçado a `disabled`:

`COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED`.

Deployment final READY promovido ao domínio canônico:

`https://comunvrabandonada-pei1ms2pg-alexandrevrabandonada-oss-projects.vercel.app`.

As rotas `/comun`, `/comun/relatar`, `/comun/calcadas`, `/comun/onibus` e
`/comun/minha-participacao` responderam `200` no workflow e em smoke GET
independente.

O smoke Production usou quatro fixtures privadas com marcador sintético, sem
pessoa, diagnóstico, unidade real, documento, foto ou localização. O cleanup
em `finally` terminou com:

- active synthetic reports/cases/wallet items/wallets: `0`;
- active packages/attempts: `0`;
- public snapshots e collectives: `0`;
- external sends e external requests: `0`;
- hard deletes: `0`.

Não houve package sensível, window.open, ligação, WhatsApp, e-mail, submit,
auto-send ou publicação. Mapa público geral, coletivos e
`launch_publicly=false` permanecem inalterados.

## Resultado

`COMUN_48_1B_P6C_A_SUS_PRIVATE_DOMAIN_GREEN_FORWARDING_OFF`.

Próximo tijolo elegível: `48.1B-P6C-B — Educação pública e proteção de
crianças`. P6C-B e P6C-C não foram iniciados neste ciclo.
