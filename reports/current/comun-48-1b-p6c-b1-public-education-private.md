# COMUN 48.1B-P6C-B1 — Educação pública privada e segura

Atualizado em 10/08/2026.

## Estado do piloto

48.1C não foi concluído nem reiniciado. A decisão de produto permanece:

`COMUN_48_1C_MOTOROLA_PILOT_PAUSED_BY_PRODUCT_DECISION`.

Nenhuma métrica humana foi declarada atingida. P6C-B2 e P6C-C não foram
iniciados.

## Escopo entregue

O Relata único em `/comun/relatar` reconhece problemas dos serviços públicos
de Educação sem criar miniapp ou intake paralelo. O roteador composável
`comun-education-service-routing-v1` preserva Saúde, Trabalho, transporte,
serviços essenciais e os roteadores ambiental e urbano.

Todo caso reconhecido usa `category=public_education`, um subtipo privado,
revisão humana e publicação `never`. Os subtipos entregues cobrem falta de
profissional/serviço, estrutura/climatização, merenda/material, transporte
escolar, acessibilidade/inclusão, matrícula/vaga/permanência,
discriminação/bullying, informação/gestão e outro problema na Educação. A UI
e a Carteira exibem somente labels humanos.

As separações críticas ficaram determinísticas:

- escola sem professor → Educação pública;
- professor sem receber salário → Trabalho;
- transporte escolar não passou → Educação pública;
- ônibus de linha não passou → Transporte público.

A pergunta de tipo é tipada, opcional e nunca bloqueia Guardar. Nome da unidade
e esfera da rede continuam opcionais e posteriores ao protocolo. Texto válido
ou foto privada continuam suficientes para capturar.

Foto-only permanece `original_text=NULL` e `category=other`, sem visão
computacional ou inferência de Educação. O enriquecimento semântico posterior
preserva report, case, protocolo e item de Carteira.

## Privacidade e proteção infantil

Todo `public_education` tem privacy floor `restricted`, publicação `never` e
`requiresHumanReview=true`. Sinais individualizáveis, deficiência, bullying,
discriminação, violência, ameaça, informação familiar, estudante ou documento
elevam a proteção para `sensitive` ou `high_risk`.

Nenhum caso de Educação é candidato automático a snapshot, mapa, busca
pública, coletivo ou observatório bruto. A Carteira não mostra texto integral,
estudante, escola, turma, foto, localização, documento ou dado familiar.

Sinais de violência grave, abuso, exploração ou perigo imediato geram
`childSafetySignal=true`, `high_risk` e orientação separada para a rede de
proteção. O COMUN informa que ninguém foi acionado, não trata um canal
educacional como suficiente e não abre nem envia nada automaticamente.

O escopo de categoria própria e encaminhamento de proteção permanece
explicitamente diferido:

`COMUN_P6C_B1_CHILD_PROTECTION_ROUTING_DEFERRED_TO_B2`.

## Preflight, contrato remoto e migration estreita

O preflight remoto leu somente metadata/schema e confirmou
`public_education`, `public_health` e `workplace` nas constraints, RPCs,
classification transition, routing decision, grants, RLS/FORCE RLS, Carteira
fail-closed e histórico de migrations. Nenhum conteúdo de relato foi lido.

A categoria pública já existia, mas o contrato server-side vigente aceitava
somente a routing version privada de Saúde. O E2E descartável comprovou que a
nova routing version/subtipo/transition de Educação exigiam a exceção estreita
prevista no escopo. Foi promovida exatamente uma migration forward-only:

- `20260810155310_comun_public_education_sensitive_routing.sql`;
- SHA-256
  `10e629df1e7d31806588e44d6276d70b35e2b2f843467cae4f8d699cfa238dfe`;
- aceita e sanitiza somente routing version, subtipo e child-safety signal
  allowlisted;
- exige privacy `restricted`, `sensitive` ou `high_risk`, publicação `never` e
  revisão humana;
- permite transition photo-only no mesmo report/case/protocolo/Carteira com
  evento append-only;
- reasserta execução somente para `service_role`;
- não cria tabela, categoria, source domain ou forwarding;
- não faz backfill, leitura de negócio, reclassificação histórica ou hard
  delete.

O dry-run remoto do run `31409363505` listou somente essa migration. A exceção
histórica de Calçadas foi reconciliada pelo procedimento vigente; não foram
usados `--include-all`, migration repair, reset ou seed.

O postflight read-only confirmou migration aplicada, Saúde preservada,
routing/subtipo/transition de Educação aceitos, privacy floor, RLS/FORCE RLS,
execução negada para `anon` e `authenticated`, execução permitida somente para
`service_role` e `businessRowsRead=false`.

O Supabase local no Windows não conseguiu concluir o histórico antigo de
Storage após encontrar uma faixa de porta reservada. A prova autoritativa foi
executada em Supabase Linux descartável no GitHub Actions; Production não foi
usada como laboratório.

## Catálogo institucional

As fontes foram revalidadas em 10/08/2026 somente em páginas oficiais, sem
ligação, mensagem, formulário, login ou teste operacional:

- SME de Volta Redonda:
  `https://www.voltaredonda.rj.gov.br/administracao-municipal/administracao-direta/sme-secretaria-municipal-de-educacao/`;
- portal da SME: `https://www.smevr.com.br/`;
- rede de ouvidorias do RJ, incluindo SEEDUC:
  `https://cge.rj.gov.br/enderecos-horarios-contatos-rede-ouvidorias-transparencia/`;
- OuvERJ: `https://www.rj.gov.br/ouverj/`;
- Matrícula Fácil:
  `https://matriculafacil.rj.gov.br/DuvidasRenovacao/Index`;
- Conselho Tutelar de Volta Redonda, Carta de Serviços 21:
  `https://servicos.voltaredonda.rj.gov.br/cartaServicos/21/`;
- Conselho Tutelar I e II:
  `https://conselhos.voltaredonda.rj.gov.br/conselhos/conselho-tutelar-do-municipio-de-volta-redonda-ct-i-e-ii`;
- Disque 100:
  `https://www.gov.br/mdh/pt-br/acesso-a-informacao/disque-100/disque-100`;
- SAMU 192:
  `https://www.gov.br/saude/pt-br/composicao/saes/samu-192`.

Todos estão `source_verified`, `operationally_unchecked` e
`automationAllowed=false`. Conselho Tutelar e Disque 100 aparecem somente
diante de sinal de proteção infantil ou consulta explícita; não são fallback
para problemas administrativos. O canal municipal é apenas informativo e não
recebe prefill de estudante, responsável, endereço, telefone ou e-mail.

## Forwarding

O catálogo é server-side, versionado e fora do SQL. Nenhum pacote sensível,
source domain ou adapter novo foi criado. Nenhum texto, estudante, escola,
turma, foto, localização ou contato é copiado para canal externo.

Permanece forçado a `disabled`:

`COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED`.

Resultado arquitetural registrado:

`COMUN_P6C_B1_EDUCATION_FORWARDING_DEFERRED_EXPLICIT_CONSENT_REQUIRED`.

## Verificação e merge funcional

- PR funcional `#260`;
- head final exato `f3dc4aad41f9ff5c737671b25fab67579b0fa047`;
- merge exact-head `111e0f1d09b6cf26ab07ebcaf6375d1c70adee2e`;
- 31 checks verdes, zero falha, zero pendência e zero review thread;
- Vercel Preview READY;
- 143 arquivos e 684 testes unitários locais verdes, além de testes focais,
  typecheck, lint e build;
- F1, F2, S1, S3, P3, P4, P5, P6A, P6B-A, P6B-B, P6C-A, Google Auth,
  Wallet, RLS/grants, Security, no-leak, accessibility, Core Journeys e
  Quality verdes;
- E2E descartável:
  `COMUN_P6C_B1_PUBLIC_EDUCATION_PRIVATE_DISPOSABLE_E2E_GREEN`.

O E2E comprovou os cenários A–L, privacy restricted/sensitive/high-risk,
distinção Educação/Trabalho/transporte, proteção infantil sem acionamento,
photo-only sem inferência, transition no mesmo protocolo, receipt inválido
negado, outra Carteira isolada, categoria não forjável e zero forwarding,
request externo, snapshot, coletivo ou hard delete.

## Production

O exact main `111e0f1d09b6cf26ab07ebcaf6375d1c70adee2e` foi promovido no run
`31409363505`. A migration, o postflight e o deploy flags-OFF passaram. O
deployment intermediário foi:

`https://comunvrabandonada-h8a7l6mhz-alexandrevrabandonada-oss-projects.vercel.app`.

Em seguida, a onda privada `31409690559` ativou somente:

`COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED=enabled`.

O forwarding sensível permaneceu `disabled`. Deployment final READY promovido
ao domínio canônico:

`https://comunvrabandonada-ml69utvan-alexandrevrabandonada-oss-projects.vercel.app`.

As rotas `/comun`, `/comun/relatar`, `/comun/calcadas`, `/comun/onibus` e
`/comun/minha-participacao` responderam `200` no workflow e em smoke GET
independente.

O smoke Production usou quatro fixtures privadas com marcador sintético, sem
pessoa, estudante, escola real, turma, documento, foto ou localização. O
cleanup em `finally` terminou com:

- active synthetic reports/cases/wallet items/wallets: `0`;
- active packages/attempts: `0`;
- public snapshots e collectives: `0`;
- external sends e external requests: `0`;
- hard deletes: `0`.

Não houve package sensível, window.open, ligação, WhatsApp, e-mail, submit,
auto-send ou publicação. Mapa público geral, coletivos e
`launch_publicly=false` permanecem inalterados.

## Resultado

`COMUN_48_1B_P6C_B1_PUBLIC_EDUCATION_PRIVATE_DOMAIN_GREEN_FORWARDING_OFF`.

Próximo tijolo elegível: `48.1B-P6C-B2 — proteção de crianças`. P6C-B2 e
P6C-C não foram iniciados neste ciclo.
