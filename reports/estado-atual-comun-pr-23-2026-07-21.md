# Estado atual do COMUN — PR #23

Atualizado em 22 de julho de 2026.

## Decisão vigente

**SOLO_READY_TO_PROMOTE**, desde que o HEAD publicado conclua FAST e FULL verdes.

O projeto adotou modo solo unificado. A ausência de revisores externos, GitHub Environments, cofre próprio ou restore completo não é mais um bloqueio. Falhas técnicas concretas continuam fail-closed.

## Situação

- Repositório: `alexandrevrabandonada-oss/comunvrabandonada`
- PR: [#23](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/23)
- Branch: `codex/sprint-40-1-mobile-preview`
- HEAD inicial do lote: `5484712555ab11d565e828d8f405f6bbd86b915c`
- `main` no início do lote: `a599d124a84c5542ec3a56052276024b9bd4854a`
- PR aberta, draft e mesclável no preflight
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

## Ações ainda não realizadas

- nenhuma label de promoção aplicada;
- nenhuma migration remota;
- nenhum merge;
- nenhum deploy manual;
- nenhum domínio movido;
- nenhuma tag;
- nenhuma abertura de piloto.

## Próximo passo

Concluir FAST e FULL do HEAD publicado. Com ambos verdes, aplicar a ação manual única `comun:promover` e acompanhar o workflow até `SOLO_PRODUCTION_GREEN`.
