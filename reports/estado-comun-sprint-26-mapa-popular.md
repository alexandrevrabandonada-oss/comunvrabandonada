# Estado do COMUN — Sprint 26: Mapa Popular

Data: 14/07/2026. Branch: `codex/comun-admin-auth-remote`.

## Diagnóstico e arquitetura

`comun_hub_territories` foi reutilizada como raiz comum. PostGIS 3.3.7 está disponível, mas não instalado; adotou-se latitude/longitude e GeoJSON estrito para evitar extensão e custo operacional. Reciclagem, cooperativas e Território Tomado são especializações do mesmo motor, vinculadas à pauta central, projetos, ações, tarefas, evidências, resultados e Acervo.

## Entrega

- Geometria: Point, LineString, Polygon e MultiPolygon, até 100 KB, sem propriedades arbitrárias; coordenadas validadas, arredondadas ou ocultas.
- Camadas: Reciclagem, Cooperativas, Economia solidária, Território Tomado, Meio ambiente, Mobilidade, Equipamentos públicos e Ações.
- Reciclagem: pontos, estado, verificação, 15 materiais, restrição/preparação e rotas aproximadas sem promessa de coleta.
- Cooperativas: perfil operacional sem ranking, serviços, materiais, estrutura, necessidades e contatos autorizados/privados separados.
- Necessidades: transversal, com CTA de ajuda e contato privado.
- Território Tomado: imóveis, fontes, atribuições com confiança/revisão e propostas de uso social explicitamente não oficiais.
- Público: `/comun/mapa`, ficha, modos Mapa/Lista/Frentes, `/comun/reciclagem`, `/comun/cooperativas`, `/comun/territorio-tomado` e contribuição moderada.
- Admin: `/comun/admin/territorio` para entidade, geometria, especialização, necessidade, fonte e atribuição.

## Segurança

Migração `20260715002809_comun_popular_map.sql` aplicada local e remotamente. Todas as tabelas novas têm RLS, sem grants para anon/authenticated. Helpers service-role selecionam campos públicos explicitamente. Contato privado, localização privada, detalhes brutos, anexos, matrícula, risco, notas internas e responsáveis internos não aparecem no HTML. Contribuições entram `pending`, com honeypot e limite diário; nada publica automaticamente.

## Verificação

- Reset completo e lint de banco local: aprovados.
- Lint remoto: aprovado; migrations local/remoto alinhadas.
- `RLS_MATRIX_OK` para todas as tabelas territoriais.
- ESLint, TypeScript e build Next.js 16.2.10: aprovados.
- Vitest: 12 arquivos, 77 testes aprovados.
- Playwright/axe: 28/28 em 360, 390, 768 e 1366 px; contraste, foco e overflow aprovados.
- Smoke territorial local: ponto, materiais, cooperativa, necessidade, imóvel, fonte, atribuição, proposta, pauta, ação, resultado, páginas, privacidade, pending e cleanup aprovados.
- Suíte E2E geral: 111/112 aprovados; a única falha foi o login legado da observabilidade musical, rejeitado pelo Supabase com `E-mail ou senha inválidos`. A falha também foi a única em 96 testes do recorte axe e não envolve código territorial. As superfícies públicas e os 28 casos da Sprint 26 permaneceram verdes.
- Smokes integrados locais: mapa, Hub central, fundação do Acervo, ausência de vazamento HTTP, autenticação/admin, UI pública e proteção dos endpoints do scheduler aprovados.
- Dependências: `npm audit --audit-level=high` aprovado; restam duas vulnerabilidades moderadas na cadeia PostCSS/Next, sem atualização forçada neste sprint.

## Regressão congelada

O Hub central, scheduler, História Oral e Acervo não receberam alteração estrutural. Em 14–15/07/2026 foram confirmadas cinco execuções recentes do workflow `archive-processing-scheduler.yml`, todas `event=schedule`, branch `main`, concluídas com sucesso. Os cinco heartbeats correspondentes no Supabase estão `passed`, com origem `scheduler`; fila, retries, dead-letter, jobs presos, cleanup pendente e alertas críticos do processamento estão em zero. Cron, secrets, endpoint e fila não foram alterados.

## Custos e riscos

Custo incremental de mapas: zero — sem tiles, geocoding, PostGIS ativado ou provedor externo. O custo permanece nas leituras atuais de Supabase/Vercel. Riscos residuais: qualidade e atualização dependem de curadoria humana; coordenadas aproximadas não servem para navegação; atribuições podem ficar desatualizadas e exigem revisão periódica; o mapa SVG é uma base operacional, não cartografia oficial.

## Deploy

Produção publicada em 14/07/2026 no deployment `comunvrabandonada-lhuqj45xc-alexandrevrabandonada-oss-projects.vercel.app`, promovido ao alias `https://comunvrabandonada.vercel.app`. O build Vercel com Next.js 16.2.10 foi aprovado. No alias oficial passaram os smokes de Mapa Popular, Hub central, fundação do Acervo, não vazamento HTTP, autenticação/admin, UI pública e proteção dos endpoints do scheduler. O smoke de R2 real permaneceu deliberadamente fora do gate porque exigiria escrita externa adicional; a fundação e as regras de publicação do Acervo passaram sem essa escrita.

## Próximo tijolo

Executar uma campanha de verificação de campo com 10 pontos de reciclagem e 3 organizações, registrando fonte, responsável e data de revisão antes de avaliar PostGIS ou tiles cartográficos.
