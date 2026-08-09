# COMUN 48.1B-F1 — Motorola Pass

Data: 2026-08-08

## Baseline

- `repository_main_sha`: `633ded9b6dac89998d77234b74b6c4c41ef15c7a`
- branch: `codex/48-1b-f1-motorola-pass`
- escopo: UX, navegação, linguagem, progressive disclosure, testes e documentação
- migrations novas: `0`
- alterações de backend/schema/RPC/RLS/Storage/criptografia: `0`

## Resultado funcional

- centro do bottom nav App V2 aponta diretamente a `/comun/relatar` com nome acessível “Vi um problema”;
- CTA dominante da Home aponta diretamente ao Relata e permanece visível com ou sem pendências;
- header desktop expõe “Vi um problema” e mantém “Participar” como opção ampla;
- Home e shell de Calçadas usam `/comun/calcadas/contribuir` como rota P4 canônica;
- ParticipateSheet mantém participação ampla, com “Vi um problema”, Calçada, Ônibus e resposta institucional no primeiro grupo;
- Ônibus não presume atraso: o tipo começa vazio e detalhes opcionais começam recolhidos;
- Minha Participação usa “Meus registros” como linguagem primária e mantém Carteira como explicação secundária;
- Relata usa “O que aconteceu?”, “Uma frase basta” e “Guardar”, sem alterar seu contrato funcional.

## Verificação

- unitários: `536/536` verdes;
- contratos Motorola focais: `5/5` verdes;
- E2E focal de shell/participação: `3/3` verdes;
- typecheck: verde;
- lint: verde;
- build: verde (`117/117` páginas estáticas geradas);
- Browser em `390x844`: Home e navegação móvel renderizadas; link central direto e sem sheet; gesto chegou a `/comun/relatar`;
- Calçadas renderizada: CTA “Registrar calçada” em `/comun/calcadas/contribuir`;
- dry-run Supabase reconciliado: `COMUN_F1_REMOTE_MIGRATION_PLAN_EMPTY`;
- migration externa de Calçadas restaurada com SHA canônico após o dry-run.

O runner Playwright local que tenta iniciar novamente o laboratório Supabase excedeu o tempo de inicialização antes de executar testes; isso foi classificado como infraestrutura local, sem finding funcional. A lane canônica Quality Performance da PR permanece responsável pelo E2E completo em ambiente reproduzível.

## Segurança e limites

- nenhuma escrita Supabase;
- nenhuma migration aplicada;
- nenhuma flag alterada;
- nenhum fixture de Production;
- nenhum envio STMU;
- `launch_publicly=false` preservado.

## Resultado

Estado de integração: pendente de PR/CI/merge/smoke de Production.
