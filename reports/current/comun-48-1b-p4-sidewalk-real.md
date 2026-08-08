# COMUN 48.1B-P4 — Calçadas sobre Relata e Carteira

Estado: candidato P4 implementado; lane descartável P4A/P4B verde; integração e ativação remota ainda pendentes da CI do head final.

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

## Verificações locais

- testes focais P4: verdes;
- typecheck: verde;
- lint: verde, sem erro;
- build Next 16.2.11: verde;
- dry-run remoto: exatamente uma migration;
- Docker Desktop local: daemon não respondeu dentro do limite; nenhuma limpeza ampla foi executada;
- rehearsal SQL/HTTP completo: transferido para a lane descartável `COMUN P4 / sidewalk Relata review E2E`, sem secrets remotos.
- rehearsal descartável P4A/P4B: verde no run `31272121500`, job `93139744374`;
- runner de promoção: exato-one, com quarentena/restauração da release externa de Calçadas;
- runner de ativação: flags-off → P4A com fixture privada/cleanup → P4B read-only, com rollback por flag.

Resultado provisório: `COMUN_P4A_SIDEWALK_PRIVATE_INTAKE_E2E_GREEN` + `COMUN_P4B_SIDEWALK_REVIEW_PROJECTION_E2E_GREEN`; checks agregados do novo head pendentes.
