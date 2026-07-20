# Estado do COMUN — Sprint 27.1: Campanhas de observação

Data: 15/07/2026. Branch: `codex/comun-admin-auth-remote`.

## Resultado

Foi adicionada a camada operacional de campanhas sobre o motor de Observatórios Populares: campanha → plano de amostragem → turno/equipe → observação pendente → revisão de qualidade → cobertura → evidência/ação → relatório aprovado. Ela não duplica métricas nem altera o scheduler do Acervo.

## Entregas

- Modelo relacional de campanha, planos, turnos, designações privadas, revisões, diário, relatório e vínculo de evidência; migration `20260715021055_comun_observation_campaigns.sql` aplicada local e remotamente.
- RLS em todas as novas tabelas, revogação para `anon`/`authenticated` e grants explícitos apenas a `service_role`.
- Dashboard administrativo por campanha, criação de plano/turnos, cobertura separada de qualidade, alertas de cobertura e revisão auditável.
- Modo de campo protegido por sessão admin/editor em `/comun/observatorios/[slug]/campo/[campaignSlug]`; validação server-side, atraso/espera calculados, flags para inconsistência e registro privado `pending`.
- Relatório público apenas para campanha concluída, com modo `report_after_approval` e status `published`; rota inexistente retorna 404 sem dados internos.
- Conversão de síntese agregada em evidência `candidate` e geração de ação em `proposal`; não há cópia de payload bruto.

## Piloto e dados reais

O piloto é configurável, mas não foi iniciado. O Supabase remoto foi conferido após os smokes: **0 campanhas reais** e **0 observações reais ligadas a campanhas**. As fixtures técnicas usadas em validação foram removidas no fim de cada execução.

## Regressão do scheduler

Checagem somente-leitura: três execuções recentes de `archive-processing-scheduler.yml` em `schedule/main` concluíram com sucesso (incluindo a mais recente de 15/07/2026 00:56 UTC). Os três heartbeats correspondentes estão `passed`, origem `scheduler`; não há alerta crítico aberto. Cron, secrets, endpoint e fila não foram alterados.

## Verificação

- `npm run typecheck`, ESLint e build Next.js 16.2.10: aprovados.
- Migration: `supabase db reset --local`, push remoto e lint local/remoto aprovados. O CLI registrou o aviso não bloqueante já conhecido de cache pg-delta/CA após o push, mas confirmou a migration aplicada.
- Unitários: 14 arquivos e 88 testes aprovados.
- E2E completo: 133 aprovados, 3 skips condicionais e nenhuma falha; teste de campanha passou nos quatro viewports.
- Axe: incluído no gate completo sem violações séria/crítica nas rotas visuais/a11y; modo de campo protegido verificado em todos os viewports.
- Smoke de campanha: pauta, observatório, metodologia, formulário, campanha, plano, turno, escala, observação pending, revisão, aceite, diário privado, evidência, vínculo, relatório, rota pública sanitizada e cleanup aprovados.
- A auditoria de matriz RLS legada sofreu timeout de telemetria do CLI após retornar a consulta de policies; a migration nova foi validada por reset/lint e pelo smoke de privacidade. O smoke abrangente de matriz também encontrou um 404 pré-existente em `/comun/dossies` no servidor local sem fixtures, fora da superfície de campanha.
- `npm audit --audit-level=high` concluiu sem achado alto; restam 2 vulnerabilidades moderadas transitivas em PostCSS/Next. A correção indicada reduz Next para 9.3.3 e não foi forçada.

## Custos, limites e riscos

Não foram adicionados serviços externos, IA, geocoding, tiles ou biblioteca de gráficos. O custo incremental é apenas leitura/escrita das tabelas já hospedadas. Riscos residuais: cobertura desigual, escala incompleta, duplicidade, informação de horário não oficial e interpretação indevida. A interface explicita metodologia, cobertura e limitação; qualidade não é confundida com representatividade.

## Deploy

Produção publicada em 15/07/2026 no deployment `comunvrabandonada-3kzv06g2i-alexandrevrabandonada-oss-projects.vercel.app`, promovido para `https://comunvrabandonada.vercel.app`. O build remoto passou. No alias oficial passaram os smokes de campanha, Hub central, Mapa Popular e não-vazamento HTTP; o smoke de campanha criou e removeu seus dados técnicos e confirmou que e-mail/diário privados não entram no relatório público.

O smoke amplo `public-ui` permanece com 404 em rotas legadas de pauta, comunidades, dossiês, segurança e relato no alias. Essas rotas não foram alteradas nesta sprint e a falha é registrada como pendência herdada, sem correção fora de escopo.

## Próximo passo humano

Definir uma única linha, dois turnos e responsáveis autorizados; aprovar metodologia/plano antes de mover uma campanha de `draft` para `ready`. Publicar somente depois de revisão humana e amostra mínima atingida.
