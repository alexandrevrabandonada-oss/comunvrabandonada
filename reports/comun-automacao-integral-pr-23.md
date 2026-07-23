# Automação integral da PR #23 — modo solo unificado

Atualizado em 23 de julho de 2026.

## Estado atual

**SOLO_PRODUCTION_GREEN**.

- PR canônica: [#23](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/23)
- Branch única: `codex/sprint-40-1-mobile-preview`
- HEAD final promovido: `78ace0a3ec6c4f150abb2039f81a4b6732853045`
- merge commit em `main`: `37371098e8f78b1effc047e18b6f8504b3a58f31`
- Operação: uma pessoa, uma decisão manual de promoção
- Gate humano do produto: 0/3; permanece separado da promoção técnica
- Piloto público: fechado

## Arquitetura vigente

| Workflow | Responsabilidade | Escrita remota |
| --- | --- | --- |
| `comun-ci.yml` | FAST em toda PR/push; FULL na PR #23 e promoção | não |
| `comun-promote.yml` | checkpoint, migration, preview, merge, deploy, smoke e rollback | somente após `comun:promover` |
| `comun-nightly.yml` | FULL diário e scheduler do acervo | somente wake protegido do scheduler existente |

Os workflows PR23 anteriores foram retirados da pasta ativa e preservados em `.github/workflows-disabled/pr23/`. A governança de duas revisões, quatro Environments, labels intermediárias, cofre externo e restore obrigatório é evidência histórica, não requisito vigente.

## Garantias

- push não promove;
- label desconhecida não promove;
- operador precisa de `admin` ou `maintain`;
- alteração do SHA cancela;
- CI ou preview vermelho cancela;
- SQL destrutivo cancela antes de acesso remoto;
- pacote de reconciliação roda em uma transação forward-only;
- checkpoint é sanitizado, não contém linhas de usuários e expira em sete dias;
- falha pós-merge tenta restaurar apenas a aplicação e abre incidente;
- nenhum SQL reverso automático existe.

## Contrato remoto

O contrato usa somente os cinco secrets do Supabase e quatro da Vercel listados em `docs/COMUN_SOLO_OPERATIONS.md`. Nenhum valor é documentado. O contrato `PR23_BACKUP_*` está descontinuado.

## Resultado do lote

- CI FAST/FULL e Vercel: aprovados no HEAD final;
- checkpoint sanitizado: criado;
- reconciliação Supabase: concluída e idempotente;
- merge commit: concluído;
- deployment da `main`: concluído automaticamente;
- domínio: transferido de `comun-social` para `comunvrabandonada`;
- smoke público: 19/19 ciclos verdes por mais de 15 minutos;
- deploy manual: não executado;
- SQL reverso: não executado;
- gate humano: 0/3;
- piloto público: fechado.

## Pendências posteriores

- alinhar o histórico remoto de migrations sem usar `repair` para ocultar falhas;
- executar o gate humano com três participantes;
- rotacionar credenciais administrativas expostas durante a preparação,
  sem interromper a produção atual.
