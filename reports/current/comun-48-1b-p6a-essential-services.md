# COMUN 48.1B-P6A — água, energia e iluminação

Atualizado em 09/08/2026.

## Estado

- baseline confirmado: `origin/main=7ee7123dbd3c66b8713e3238d35a422734f029b6`;
- estado inicial confirmado: `COMUN_48_1B_F2_CAPTURE_FIRST_DOMAIN_GREEN`;
- branch nova: `codex/48-1b-p6a-essential-services`;
- PR funcional `#243` mesclado por exact-head em
  `0a4ada3f54d29dd7d48a71363a9f406b03edfcdd`;
- schema e runtime Production foram alterados somente depois do plano de
  promoção registrado, com gates separados e rollback focal;
- arquivos não rastreados preexistentes foram inventariados e preservados.

## Preflight remoto

O run read-only `31316297226` usou transação somente leitura e consultou apenas
catálogo, constraints, assinaturas, grants, RLS/FORCE RLS e histórico de
migrations. Nenhum texto, foto, localização ou conteúdo de relato foi lido.

Resultado: `COMUN_P6A_REMOTE_PREFLIGHT_GREEN`.

- `public_lighting`: presente;
- `power_distribution`: presente;
- `water_supply`: ausente;
- `private.comun_forwarding_packages.bus_intake_id`: ainda obrigatório e
  acoplado a Ônibus;
- quatro tabelas P5 privadas com RLS e FORCE RLS;
- RPCs P5/STMU e grants esperados presentes;
- histórico remoto reconciliado até
  `20260809055800_comun_relata_photo_first_domain_categories`.

## Porta única e classificação

O ponto de entrada permanece `/comun/relatar`. Não foram criados miniapps para
água, energia ou iluminação.

- `water_supply` cobre falta de água, baixa pressão e vazamento/rompimento da
  rede de abastecimento;
- contaminação, cheiro químico, esgoto e poluição hídrica continuam ambientais;
- `power_distribution` e `public_lighting` foram preservados;
- “A rua inteira está sem luz” mantém uma única pergunta que muda o responsável;
- fio caído, faísca, choque e risco elétrico continuam em `electrical_hazard`;
- foto sem texto continua com `original_text IS NULL`, sem visão computacional;
- contexto posterior classifica o mesmo `report_id`, `case_id` e protocolo,
  com evento append-only e sem criar segundo item de Carteira.

## Catálogo institucional server-side

O catálogo versionado fica em
`lib/server/comun-institutional-channel-catalog.ts`. Destinos não estão na
migration. Todos os canais abaixo estão `source_verified` e
`operationally_unchecked`: a fonte oficial foi conferida, mas nenhum telefone,
site, WhatsApp, formulário ou e-mail foi testado ou acionado.

| Instituição | Categoria | Canal ativo | Fonte oficial | Identificação | Protocolo |
| --- | --- | --- | --- | --- | --- |
| SAAE Volta Redonda | `water_supply` | telefone 115 | https://www.saaevr.com.br/atendimento115.asp | fonte não esclarece | fonte não esclarece |
| Light | `power_distribution` | Agência Virtual | https://agenciavirtual.light.com.br/ | exigida pelo serviço | esperado |
| Light | `power_distribution` | 0800 021 0196 | https://www.light.com.br/SitePages/page-ressarcimento.aspx | solicitada pelo serviço | esperado |
| Prefeitura de Volta Redonda | `public_lighting` | telefone 156 | https://www.voltaredonda.rj.gov.br/85-noticias/semop/6858-central-de-atendimento-%C3%BAnico-156-de-volta-redonda-tem-novo-whatsapp/ | solicitada pelo serviço | fonte não esclarece |
| Secretaria Municipal de Infraestrutura | `public_lighting` | carta de serviço web | https://servicos.voltaredonda.rj.gov.br/cartaServicos/158/ | exigida pelo serviço | fonte não esclarece |

Não foi encontrado conflito entre fontes oficiais. Os canais complementares
foram mantidos sem eleger silenciosamente um substituto. O marcador
`COMUN_P6A_CHANNEL_SOURCE_CONFLICT` não se aplica a esta revisão.

## Migration única e segurança

Plano permitido: exatamente
`20260809133923_comun_essential_services_assisted.sql`.

- adiciona `water_supply` à constraint e ao RPC de criação;
- generaliza `private.comun_forwarding_packages` com `source_domain`;
- preserva P5 por default técnico determinístico `bus` e mantém
  `bus_intake_id` obrigatório para esse domínio;
- exige `bus_intake_id IS NULL` para `essential_service`;
- adiciona `web` à allowlist de tentativas;
- mantém os wrappers STMU e oferece helpers genéricos;
- revoga execução de browser e concede somente a `service_role`;
- não lê texto histórico, não reclassifica relatos e não contém destinos;
- oferece retirada lógica para cleanup sem hard delete.

O plano remoto move temporariamente apenas a migration histórica local de
Calçadas já reconciliada, executa `db push --dry-run` e bloqueia se o resultado
não for exatamente uma migration. Não usa `--include-all`, `migration repair`,
`reset` ou `seed`.

## Encaminhamento assistido

O texto institucional é gerado server-side. Texto da pessoa só aparece quando
`original_text` existe; foto sem descrição usa “Descrição adicional não
informada.” Coordenadas P3 nunca entram no pacote.

Abrir site ou telefone cria tentativa `prepared`. Apenas “Sim, enviei” produz
`person_declared_sent`. Protocolo COMUN e protocolo do serviço permanecem
separados. CPF, matrícula, instalação, titularidade, telefone e credenciais de
cliente devem ser informados diretamente ao serviço e não são persistidos no
COMUN.

## Promoção e ativação realizadas

Todas as etapas usaram o exact-main
`0a4ada3f54d29dd7d48a71363a9f406b03edfcdd`:

1. preflight remoto `31320178811`: plano exato de uma migration, sem
   `--include-all`, repair, reset ou seed;
2. promoção `31320220765`: exatamente a migration P6A, com as duas flags OFF;
3. postflight `31320276479`: metadata, RLS/FORCE RLS, grants, RPCs, categoria e
   compatibilidade P5 verdes, sem leitura de relatos;
4. deploy flags-off e cloak `31320322317` verdes;
5. onda 1 `31320434158`: serviços essenciais ON, forwarding OFF, uma suíte
   sintética privada com quatro casos de classificação e soft cleanup em
   `finally`;
6. onda 2 `31320554100`: forwarding assistido ON, uma fixture de água, package
   e tentativa somente `prepared`, sem abrir o destino real e sem declaração
   sintética de envio;
7. postflight read-only final `31320680060` verde; nenhum rollback foi
   necessário.

## Evidências descartáveis no candidato

No head funcional final `982a5312a1bd5e4c0c92fe222dc03fc60bd2efee`:

- E2E P6A `31319369615`:
  `COMUN_P6A_ESSENTIAL_SERVICES_DISPOSABLE_E2E_GREEN`;
- água percorreu protocolo, Carteira, pacote SAAE, abertura `prepared`,
  declaração da pessoa e resposta manual somente no laboratório;
- energia e iluminação selecionaram Light e Prefeitura, respectivamente, e
  permaneceram `prepared`;
- a ambiguidade exigiu uma decisão e produziu um protocolo; foto-only mudou o
  mesmo relato/caso/protocolo;
- receipt inválido e outra Carteira receberam `404`; grants, RLS/FORCE RLS,
  idempotência, sequência de attempts e ausência de coordenadas foram
  verificados;
- browser real em 390×844, screenshot e Axe sem violações serious/critical;
- `externalRequests=0`, `automaticSend=false`, `publicSnapshots=0` e
  `hardDeletes=0`;
- regressão P5/STMU `31319369666` verde no mesmo head, preservando
  `bus_intake_id` e `prepared != sent`.

## Fechamento Production

O cleanup final comprovou:

- active synthetic reports/cases/wallet items/wallets/packages/attempts: `0`;
- public snapshots: `0`;
- collectives: `0`;
- external sends e external requests: `0`;
- hard deletes: `0`.

Estado final: Conta, Carteira, Relata, Photo First, localização privada,
Calçadas, Ônibus, STMU assistida, serviços essenciais e forwarding assistido
estão ON. Auto-send, publicação automática, mapa público geral, coletivos,
perfil territorial e Google permanecem OFF; `launch_publicly=false`.

Resultado terminal:
`COMUN_48_1B_P6A_ESSENTIAL_SERVICES_DOMAIN_GREEN_NO_AUTO_SEND`.

Próximo passo depois de P6A: `P1G — Google Auth`; depois,
`48.1C — Piloto Humano Motorola`. P6B não deve começar antes de 48.1C.
