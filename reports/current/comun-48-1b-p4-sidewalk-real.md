# COMUN 48.1B-P4 — Calçadas sobre Relata e Carteira

Estado: P4 integrado e ativo no domínio em duas ondas; entrada real privada
operacional e projeção pública limitada a registros explicitamente revisados.

## P4A — entrada privada

- nova rota canônica `/comun/calcadas/contribuir`;
- rota antiga de contribuição de Calçadas redireciona somente quando P4 está habilitado;
- uma única fonte da verdade: Relata, categoria server-side `sidewalk_accessibility` e protocolo `COMUN-RELATA-*`;
- adapter privado guarda somente referências e campos estruturados de Calçadas;
- foto reutiliza signed upload P3; localização reutiliza AES-256-GCM P3;
- localização é obrigatória para finalizar a entrada na fila;
- Carteira mantém um único item Relata e recebe apenas estado/metadata sanitizados;
- falha depois do Relata não desfaz o relato e não afirma entrada na fila;
- forwarding, coletivos, mapa geral do Relata e publicação automática permanecem desligados.

## P4B — revisão e projeção

- nova fila `/comun/admin/calcadas/relatos`, independente do pipeline legado;
- acesso restrito a `admin|editor`;
- descrição e derivada privada ficam na tela autenticada; URL de imagem expira em cinco minutos;
- coordenada exata é decriptada somente em módulo server-only e nunca é serializada no HTML;
- `sanitizeSidewalkPointForPublic` usa grade determinística de 150 m;
- publicação exige flag própria e gesto editorial explícito;
- registro público nasce sem geometria privada, sem imagem pública e com ponto aproximado editorial;
- retirada do Relata fecha o intake e remove uma projeção já publicada da consulta pública sem hard delete de eventos.

## Migration

- arquivo: `supabase/migrations/20260808180246_comun_sidewalk_relata_real.sql`;
- SHA-256: `6ed799985fe9270ae9a8406d043d566520c2f9c89002493393c37d7076d9c494`;
- uma tabela privada, cinco RPCs server-only e um trigger monotônico de retirada;
- RLS habilitada e forçada; zero policy de cliente; zero grant `PUBLIC`/`anon`/`authenticated`;
- `dataMutation=false`, `externalForwarding=false`, publicação automática ausente.

## Verificações e integração

- testes focais P4: verdes;
- typecheck: verde;
- lint: verde, sem erro;
- build Next 16.2.11: verde;
- dry-run remoto: exatamente uma migration;
- Docker Desktop local: daemon não respondeu dentro do limite; nenhuma limpeza ampla foi executada;
- rehearsal SQL/HTTP completo: transferido para a lane descartável `COMUN P4 / sidewalk Relata review E2E`, sem secrets remotos.
- rehearsal descartável P4A/P4B do head exato: verde no run `31272838718`;
- runner de promoção: exato-one, com quarentena/restauração da release externa de Calçadas;
- runner de ativação: flags-off → P4A com fixture privada/cleanup → P4B read-only, com rollback por flag.

PRs integradas:

- #227 — produto P4: merge `96c05de6776c61c4034e02a75551646c04e44094`;
- #228 — contrato de promoção: merge `b9bcb0be743a7e6e5a319d474709a07c15eaaac3`;
- #229 — upsert seguro das flags Vercel: merge `e6d8e93025b112be01693dfab1eb5d05625e4fc4`;
- #230 — alinhamento focal do smoke flags-off ao cloak da API: merge
  `97ad858c92c8694adf7514d0df8cfe8d2c90754f`.

## Estado operacional

- flags-off verde no run `31278490774`;
- P4A real verde no run `31278576840`;
- a fixture P4A terminou com relatório, localização, anexo, intake, item de
  Carteira, Carteira e objetos de Storage ativos em zero;
- `hardDeletes=0`, foto e localização permaneceram privadas e não houve
  projeção pública;
- P4B read-only verde no run `31278723422`;
- fila pendente observada: `0`; publicação automática: `0`; registro público
  sintético criado: `false`.

Resultado terminal:
`COMUN_48_1B_P4_SIDEWALK_REAL_DOMAIN_GREEN_REVIEWED_MAP_ONLY`.
