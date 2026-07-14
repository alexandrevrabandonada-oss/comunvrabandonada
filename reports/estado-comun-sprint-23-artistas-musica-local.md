# Estado do COMUN — Sprint 23: artistas e música local

Data: 14/07/2026. Branch: `codex/comun-admin-auth-remote`.

## Parecer do comitê técnico-editorial

Entrega aprovada para produção com uma ressalva externa no Gate 0. A arquitetura mantém `comun_archive_items` como raiz, aplica moderação humana, não cria streaming, não expõe contatos e não amplia a CSP. O risco residual mais importante é operacional: o GitHub ainda não materializou uma execução com `event=schedule`, embora o workflow esteja ativo em `main` e a execução manual tenha passado.

## Gate 0 — scheduler fotográfico

- Workflow: `.github/workflows/archive-processing-scheduler.yml`, ativo em `main`.
- Execução manual bem-sucedida: run `29356425759`, `workflow_dispatch`, em 14/07/2026 18:05 UTC.
- Consulta final da Sprint 23: nenhuma execução `schedule` registrada.
- A agenda já foi deslocada para `7,22,37,52 * * * *` e integrada em `main`; não houve nova reescrita da fila.
- Classificação: bloqueio externo do scheduler do GitHub, documentado. O monitor `gate-agendado-do-acervo` deve continuar até aparecer uma execução agendada real.

## Implementação

- Modelagem: perfis, lançamentos, faixas, links, integrantes, revisões de direitos, contribuições e reivindicações, todos ligados ao item principal.
- Relações: adicionados os tipos musicais previstos; sugestões passaram a aceitar correções musicais.
- RLS: todas as oito tabelas especializadas têm RLS, grants revogados de `anon`/`authenticated` e acesso `service_role`; páginas públicas usam selects sanitizados.
- Artistas: listagem, filtros básicos, detalhe, integrantes, discografia, ativos públicos e links oficiais.
- Lançamentos: listagem, detalhe, ficha técnica, faixas, capa aprovada ou ausência explícita e aviso de plataforma externa.
- Contribuições: formulário público cria somente `pending`.
- Reivindicações: fila privada; verificação marca o vínculo, mas não altera conteúdo nem concede painel.
- Administração: criação de artista, links, lançamento, faixas, filas e publicação com checklist.
- Links: HTTPS, allowlist por plataforma, normalização e remoção de rastreamento; somente `official`/`authorized` aparece publicamente.
- Home: seção de baixa densidade “Som da nossa região” com CTAs para artistas, lançamentos e coleções.
- Áudio: MIME e extensão de áudio continuam rejeitados; não há player interno, letra completa, download ou URL de upload.

## Segurança e privacidade

Consultas públicas não selecionam `contact_private`, `claimant_contact_private`, `verification_reference_private`, `permission_reference_private`, `notes_private`, notas editoriais, hashes, object keys ou URLs assinadas. Não foram adicionados iframes nem domínios à CSP. A matriz RLS foi atualizada com as novas tabelas. A migração remota `20260714185438_archive_local_music.sql` foi aplicada; `supabase db lint --linked` retornou sem erros.

## Verificação

- `npm ci`: passou após encerrar o servidor local que mantinha o Sharp travado.
- lint: passou.
- typecheck: passou.
- testes unitários: 25/25, 6 arquivos.
- build Next.js 16.2.10: passou, incluindo todas as novas rotas.
- smoke musical local: passou com fixture descartável e limpeza.
- smoke musical em produção: passou com contribuição pending, artista, lançamento, faixa, link, reivindicação e teste de não vazamento; fixture removida.
- `smoke:no-leak-http`: passou em produção.
- `smoke:admin-auth`: passou; existe admin ativo e tabelas de autenticação/auditoria.
- `smoke:public-ui`: passou em produção para todas as rotas cobertas.
- `npm audit --audit-level=high`: nenhuma vulnerabilidade alta; duas moderadas transitivas do PostCSS empacotado pelo Next. O fix sugerido é destrutivo (`--force`) e não foi executado.

## Deploy e custos

- Supabase: migração aplicada ao projeto vinculado, sem novo serviço ou armazenamento de áudio.
- Vercel: deploy de produção bem-sucedido e alias atualizado para `https://comunvrabandonada.vercel.app`.
- R2: nenhum áudio e nenhuma fixture persistente; capas continuam usando o pipeline já existente quando autorizadas.
- Custo incremental esperado: apenas linhas pequenas no Postgres, requisições server-side e tráfego de páginas; reprodução permanece a cargo das plataformas externas.

## Commits

1. `feat: adiciona perfis de artistas locais`
2. `feat: adiciona discografias e links musicais`
3. `feat: adiciona contribuicoes e reivindicacoes de artistas`
4. `test: cobre acervo musical local`
5. `docs: documenta memoria musical do acervo`

## Riscos e próximo tijolo

- Confirmar a primeira execução real `schedule` e encerrar o monitor.
- Próximo tijolo recomendado: Sprint 23.1 de curadoria assistida, com telas de edição completas para integrantes, direitos e estados de links, verificação periódica de links quebrados e paginação/filtros facetados server-side. Manter áudio hospedado fora do escopo até existir política jurídica formal.
