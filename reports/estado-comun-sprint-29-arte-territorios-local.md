# Estado do COMUN — Sprint 29 — Arte dos Territórios (local)

Data: 15/07/2026. Escopo: implementação e validação exclusivamente local.

## Resultado

O Acervo de Arte dos Territórios foi integrado ao Acervo Vivo. Obras usam `comun_archive_items` com `item_type = territorial_artwork`; a especialização, agentes, créditos, direitos, revisão de segurança, contribuições, relações e histórico editorial ficam em tabelas próprias com RLS e acesso direto restrito ao `service_role`.

O diagnóstico concluiu que assets, coleções, relações, fila de processamento, pautas e autenticação poderiam ser reutilizados. Foi criado `comun_archive_agents` para pessoas, coletivos e organizações em diferentes linguagens, sem converter automaticamente os perfis musicais.

## Cobertura funcional

- Obras e tipos: ficha editorial, contexto, técnica, materiais, território, período e processo criativo estruturados.
- Créditos: múltiplos agentes e papéis; autoria desconhecida é explícita e nunca há promoção automática a autor principal.
- Direitos: permissões granulares para preservação, exibição, redes, impressão, exposição, educação, campanha, recorte, derivação, download e terceiros. Publicação falha fechada sem `allow_comun_display`.
- Menores e segurança: checklist privado reforçado, bloqueio de localização sensível e revisão obrigatória antes da publicação.
- Storage e derivadas: o smoke usa provider fixture local descartável; original e termos permanecem privados. Sharp gera WebP de até 400, 960 e 2000 px, preservando proporção e removendo metadados privados.
- Contribuições: nascem `pending`, vinculadas à sessão quando autenticadas, e aparecem sanitizadas em Minha Participação.
- Curadoria: rotas administrativas para obra, contribuições, direitos e créditos; publicação exige checklist fechado.
- Portal: páginas finitas, paginação e filtros server-side, estados vazios, criadores, coleções, direitos e retirada; sem ranking, likes ou rolagem infinita.
- Relações e pautas: relações com território, pauta e coleções; `art_gallery_future` foi migrado para `art_gallery` com configuração Zod e somente obras publicadas.
- Busca: somente campos públicos de obra e relações entram nas consultas.
- Design e acessibilidade: superfície mobile first, créditos e direitos visíveis, foco/teclado, headings, contraste e alt editorial.
- Correção e retirada: solicitações ficam pendentes; o smoke confirma retirada, despublicação e limpeza.

## Segurança e banco

A migration `20260715170058_comun_territorial_art_foundation.sql` aplica RLS às oito tabelas novas, revoga `anon` e `authenticated` e concede acesso de servidor. Consultas públicas selecionam campos explicitamente e não incluem contato, notas, localização privada, chaves de objeto, termos ou ids de autenticação. Resultado: `RLS_MATRIX_OK`; lint do banco local sem erros.

## Verificações executadas

- reset local completo executado duas vezes;
- 93 testes unitários aprovados;
- Playwright + axe: 20 testes aprovados nos viewports 360x800, 390x844, 768x1024 e 1366x768; zero violação séria/crítica nas superfícies cobertas;
- build Next.js aprovado e testes E2E executados contra `npm run start` em localhost;
- smoke territorial executado duas vezes, incluindo bloqueio de publicação, derivadas, direitos, relações, retirada e cleanup;
- fixture cleanup/assert-clean aprovados;
- `npm audit --audit-level=high`: sem vulnerabilidade high/critical; duas moderadas permanecem porque a correção sugerida exige `--force`, proibido neste sprint.

## Limitações e bloqueios conhecidos

O Supabase Storage local empacotado (1.62.5) ficou incompatível com o schema local reconstruído (`storage.search` ausente e resposta 502). Conforme permitido no escopo, o smoke usa provider fixture em memória e prova privacidade, derivadas e cleanup, mas a UI administrativa especializada ainda encaminha para o uploader genérico do Acervo. Antes de promover remotamente, deve-se alinhar a versão do Storage local e repetir upload E2E real.

Alertas específicos e eventos completos de auditoria foram modelados/documentados como requisitos operacionais, mas não há neste RC uma automação dedicada para todas as taxonomias das fases 29 e 30. Isso não expõe dados, porém deve ser concluído antes de produção.

Durante o primeiro uso da CLI local houve uma tentativa automática de telemetria PostHog que expirou; depois disso os comandos foram executados com `DO_NOT_TRACK=1`. Não houve acesso a Supabase remoto, R2, Vercel nem envio de dados da aplicação.

## Declarações obrigatórias

- Vercel deploy: NÃO EXECUTADO
- Git push: NÃO EXECUTADO
- Supabase remoto: NÃO ALTERADO
- R2 real: NÃO UTILIZADO
- Smoke remoto: NÃO EXECUTADO
- Custo externo: R$ 0

## Fechamento 29.1

O Storage real local, alertas e auditoria foram concluídos na Sprint 29.1. Dois ciclos independentes validaram original privado, derivadas WebP, direitos, cleanup, deduplicação e sanitização. A causa do 502 foi o Kong conservar o upstream anterior depois do restart do Storage; readiness e reinício limitado do gateway compõem o procedimento local.

Status: candidato local aprovado; promoção remota não autorizada.
