# Estado do COMUN — Sprint 23.1: curadoria musical

Data: 14/07/2026. Branch: `codex/comun-admin-auth-remote`.

## Regressão do scheduler

Checagem somente leitura confirmou execução `schedule` recente em `main`, heartbeat `passed` de origem `scheduler`, saúde `healthy`, fila/retry/dead-letter/stale/cleanup zerados e nenhum alerta crítico. Cron, secrets, endpoint e workflow não foram reconfigurados. O worker existente apenas recebeu suporte ao novo tipo de job solicitado, sem mudar autenticação ou agendamento.

## Entrega

- Editor de artistas reorganizado em seções navegáveis para identidade, biografia, território, integrantes, discografia, links, direitos, histórico e publicação.
- Editor dedicado de lançamentos em `/comun/admin/acervo/musica/[id]`, com faixas ordenáveis por disco/número, duração, compositores e intérpretes.
- Integrantes podem ser adicionados, editados, ordenados e arquivados, com função, período e fonte, sem campo de contato.
- Direitos são registrados por escopo, decisão, responsável e fonte; referências e notas privadas permanecem apenas no admin.
- Histórico editorial admin-only guarda snapshots sanitizados de artista, integrante, faixa, link e direitos.
- Reivindicações suportam pedido de informação, análise, verificação, rejeição e arquivo, sem conceder painel ou alteração automática.
- Contribuições exibem sugestão/fonte e aceitam decisão parcial com lista de campos incorporados manualmente.
- Pendências consolidadas mostram perfis incompletos, claims, contribuições, links e direitos.

## Links, checks e alertas

`comun_archive_link_checks` registra somente status, HTTP, hostname final, tempo e erro sanitizado. O verificador usa HTTPS, HEAD, timeout de cinco segundos, três redirects manuais, allowlist, DNS e bloqueio de localhost/IP privado/link-local; não armazena corpo nem baixa mídia. Jobs `music_external_link_check` reutilizam a fila persistida. Links aprovados vencem em 30 dias; falhas voltam a ser elegíveis e três falhas consecutivas marcam `broken`. Redirect inseguro vira `rejected`. Link quebrado gera alerta deduplicado por fingerprint e nunca é excluído automaticamente.

O script `prune:music-link-checks` é dry-run por padrão e exige `MUSIC_LINK_CHECK_PRUNE_CONFIRM=true`; preserva check mais recente e falhas relevantes.

## Completude, filtros e busca

A completude administrativa avalia dez requisitos e retorna percentual, faltas e recomendações; não aparece publicamente e não constitui ranking. Artistas e lançamentos usam filtros via query string, parâmetros sanitizados, contagem total, facetas e paginação server-side de 12 itens. Consultas e facetas independentes rodam em paralelo; páginas de detalhe também usam consultas paralelas para evitar waterfalls.

## UX, acessibilidade e segurança

Foram adicionados loading, error e not-found coerentes, estados vazios, `aria-live`, labels de navegação/filtros, foco visível, cards responsivos e navegação horizontal controlada no admin mobile. Links externos continuam simples, sem iframe ou CSP ampliada. Áudio, letras completas, streaming e downloads continuam bloqueados.

RLS foi ativado nas novas tabelas, com grants removidos de `anon` e `authenticated`; apenas `service_role` acessa histórico/checks. Snapshots removem contatos, referências privadas, notas integrais, tokens, segredos e URLs assinadas. A migração remota `20260714213123_archive_music_curation.sql` foi aplicada e `supabase db lint --linked` não encontrou erros.

## Testes e operação

- lint e TypeScript: aprovados.
- testes unitários: 38/38 em sete arquivos.
- build Next.js 16.2.10: aprovado com todas as novas rotas.
- smoke `music-curation`: aprovado com fixture e limpeza no Supabase.
- smoke `local-music-archive`: aprovado novamente em produção.
- smokes `no-leak-http`, `admin-auth` e `public-ui`: aprovados em produção.
- `npm audit --audit-level=high`: nenhuma vulnerabilidade alta; duas moderadas transitivas do Next/PostCSS, sem uso de `--force`.
- A matriz RLS local requer banco local atualizado para reconhecer as tabelas já aplicadas no remoto; o lint remoto e as grants explícitas da migration foram aprovados.

## Custos, riscos e próximo tijolo

Custos incrementais: linhas pequenas de histórico/checks, HEAD requests periódicos e uso limitado do worker existente. Não há armazenamento ou tráfego de áudio. Riscos: plataformas podem bloquear HEAD e exigir fallback GET mínimo; isso deve ser habilitado por plataforma somente após evidência, sem afrouxar SSRF. Facetas são calculadas server-side e devem migrar para RPC/visão materializada apenas quando volume e métricas justificarem.

Deploy Vercel de produção concluído, com alias `https://comunvrabandonada.vercel.app`. A instalação limpa de dependências encontrou um timeout/lock transitório do Windows após remover pacotes, mas a instalação ficou utilizável e toda a sequência lint, TypeScript, 38 testes, build e smokes passou em seguida.

Próximo tijolo recomendado: Sprint 23.2 de observabilidade da curadoria, com dashboard de latência/taxa de falhas por plataforma, fallback GET controlado, teste visual automatizado em 360/390 px e políticas de SLO editorial.
