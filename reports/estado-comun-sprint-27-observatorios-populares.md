# Estado do COMUN — Sprint 27: Observatórios Populares

Data: 15/07/2026. Branch: `codex/comun-admin-auth-remote`.

## Diagnóstico e arquitetura

O diagnóstico pré-migração está em `reports/comun-diagnostico-observatorios.md`. Foi criado um motor único ligado à pauta, projeto e território: observação → revisão → agregação → snapshot → evidência/ação. Transporte reutiliza esse motor.

## Entrega

- Observatórios, entidades monitoradas, metodologias e formulários versionados.
- Payload limitado e validado no servidor; observação privada/pending, protocolo, deduplicação e verificação auditável.
- Métricas configuradas sem SQL arbitrário; snapshots idempotentes com metodologia, período, amostra, cobertura e limitações.
- Ônibus em Movimento com atraso/espera calculados, serviço não realizado e seis dimensões padronizadas de qualidade.
- Portal, formulário público, dados, gráficos com tabelas, mapa de cobertura agregado, ações, admin e exportações CSV/JSON.
- Alertas transparentes para pendência, obsolescência, snapshot em revisão e linha sem cobertura.

## Segurança

Todas as tabelas são service-role only, com RLS e grants explícitos. Contato, payload, hash, evidência e notas não entram em HTML ou exportação. Não há motorista, passageiro, trajeto pessoal, localização contínua ou publicação automática. A matriz RLS será anexada ao gate final.

## Verificação

- `npm ci`, ESLint, TypeScript, build e `npm run verify`: aprovados com Next.js 16.2.10.
- Banco: reset completo, migration remota e lint local/remoto aprovados; `RLS_MATRIX_OK`.
- Unitários: 13 arquivos, 85 testes aprovados.
- E2E: 148 casos, 145 aprovados e 3 skips condicionais; zero falha. Axe: 129 aprovados e 3 skips condicionais; zero violação séria/crítica.
- Sprint 27: 36/36 testes em 360, 390, 768 e 1366 px, com gráficos/tabelas, formulário, foco, contraste e overflow.
- Smokes locais: observatório, Mapa Popular, Hub central, não vazamento, autenticação admin e UI pública aprovados; fixture e contato privados removidos.
- O legado 111/112 foi resolvido: senha de teste sincronizada sem exposição, autorização validada pelo usuário retornado antes do redirect e timeout de navegação ajustado à compilação dev. A suíte agora está verde.
- Dependências: `npm audit --audit-level=high` aprovado; permanecem duas vulnerabilidades moderadas transitivas em PostCSS/Next, cuja correção sugerida é breaking e não foi forçada.

## Gate de regressão

Hub e Mapa passaram nos smokes. Três execuções recentes do scheduler continuam `schedule/main/success`; os heartbeats estão `passed` e fila, retry, dead-letter e alertas críticos estão em zero. Cron, secrets, endpoint e fila não foram alterados.

## Deploy

Produção publicada em 15/07/2026 no deployment `comunvrabandonada-mrr61nmvg-alexandrevrabandonada-oss-projects.vercel.app`, promovido para `https://comunvrabandonada.vercel.app`. O build Vercel passou. O gate real criou observatório, metodologia, formulário, linha, ponto, observações, duplicidade, métricas, snapshots, pauta e ação descartáveis; confirmou portal, mapa, CSV/JSON agregados, ausência de contato/payload bruto e cleanup. Smokes de Mapa, Hub, não vazamento, autenticação e UI pública também passaram no alias oficial.

## Custos e riscos

Sem biblioteca de gráficos, tiles, geocoding ou IA: custo incremental é de leituras/escritas existentes em Supabase/Vercel. Riscos principais são cobertura desigual, baixa amostra, duplicidade e interpretação indevida; a interface sempre qualifica os dados como comunitários.

## Próximo tijolo

Operar um piloto pequeno por linha e faixa horária, revisar qualidade da coleta e só então definir cobertura mínima para comparação pública.
