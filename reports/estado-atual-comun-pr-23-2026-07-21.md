# Estado atual do COMUN — PR #23

Atualizado em 23 de julho de 2026.

## Decisão vigente

**SOLO_PRODUCTION_GREEN**.

A PR #23 foi mesclada por merge commit em `main`. O deployment canônico e o
domínio público passaram no smoke de produção.

O projeto adotou modo solo unificado. A ausência de revisores externos, GitHub Environments, cofre próprio ou restore completo não é mais um bloqueio. Falhas técnicas concretas continuam fail-closed.

## Situação

- Repositório: `alexandrevrabandonada-oss/comunvrabandonada`
- PR: [#23](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/23)
- Branch: `codex/sprint-40-1-mobile-preview`
- HEAD inicial do lote: `5484712555ab11d565e828d8f405f6bbd86b915c`
- `main` no início do lote: `a599d124a84c5542ec3a56052276024b9bd4854a`
- HEAD final da PR: `78ace0a3ec6c4f150abb2039f81a4b6732853045`
- Merge commit: `37371098e8f78b1effc047e18b6f8504b3a58f31`
- PR mesclada em 23 de julho de 2026
- Gate humano: 0/3
- Piloto público: fechado

## Trabalho consolidado

- CI canônico FAST/FULL;
- promoção única por `comun:promover`;
- checkpoint técnico sanitizado por sete dias;
- reconciliação transacional forward-only;
- pós-validação de banco, preview, no-leak e cleanup;
- merge commit e observação automatizados somente na promoção;
- rollback simples da aplicação, sem SQL reverso;
- nightly único preservando o scheduler do acervo;
- governança anterior arquivada sem apagar evidências.

## Segurança mantida

RLS, originais privados, uploads privados, sanitização de derivadas, limites, postflight, idempotência e ausência de service role no cliente continuam obrigatórios. A mudança reduz burocracia operacional; não reduz os controles técnicos.

## Fechamento remoto

- schema remoto reconciliado por pacote transacional forward-only;
- DB lint, postflight, RLS e cleanup dry-run aprovados;
- preview protegido validado no SHA imutável;
- deployment automático da `main` aprovado;
- `comunsocial.online` e `www.comunsocial.online` vinculados ao projeto
  Vercel canônico `comunvrabandonada`;
- observação pública superior a 15 minutos: 19/19 ciclos verdes;
- `/comun`, `/comun/calcadas` e `/comun/acervo`: HTTP 200;
- PMTiles: HTTP 206 com `Content-Range`;
- `www`: redirecionamento HTTP 308 para o apex;
- nenhum deploy manual e nenhum SQL reverso.

## Gates que permanecem fechados

- gate humano: 0/3;
- piloto público: não aberto;
- alinhamento do histórico de migrations: pendência documental/operacional,
  sem divergência do schema reconciliado.
