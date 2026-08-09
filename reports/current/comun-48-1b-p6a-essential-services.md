# COMUN 48.1B-P6A — água, energia e iluminação

Atualizado em 09/08/2026.

## Estado

- baseline confirmado: `origin/main=7ee7123dbd3c66b8713e3238d35a422734f029b6`;
- estado inicial confirmado: `COMUN_48_1B_F2_CAPTURE_FIRST_DOMAIN_GREEN`;
- branch nova: `codex/48-1b-p6a-essential-services`;
- PR funcional: `#243`, mantido em draft até CI completa;
- Production e schema remoto permanecem inalterados durante a implementação;
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

## Plano de promoção e ativação

Nenhuma etapa abaixo ocorre antes de CI completa, PR pronta, revisão e merge no
exact head:

1. preflight remoto com plano exato de uma migration;
2. promoção com as duas flags OFF;
3. postflight somente de metadata, RLS, grants, RPCs, categoria e P5;
4. deploy exact-main com flags OFF e cloak;
5. onda 1: `COMUN_ESSENTIAL_SERVICES_ENABLED=enabled`, forwarding OFF, smoke
   privado e soft cleanup em `finally`;
6. onda 2: `COMUN_ESSENTIAL_FORWARDING_ASSISTED_ENABLED=enabled`, pacote e
   tentativa somente `prepared`, sem abrir o destino real e sem declaração
   sintética de envio;
7. rollback focal automático se um gate falhar.

## Evidências pendentes para fechamento

- E2E descartável no head final;
- CI completa e Preview visual;
- merge exact-head;
- dry-run, promoção e postflight;
- ondas 1 e 2 e cleanup Production.

O marcador terminal
`COMUN_48_1B_P6A_ESSENTIAL_SERVICES_DOMAIN_GREEN_NO_AUTO_SEND` só será emitido
quando todas essas evidências estiverem verdes.

Próximo passo depois de P6A: `P1G — Google Auth`; depois,
`48.1C — Piloto Humano Motorola`. P6B não deve começar antes de 48.1C.
