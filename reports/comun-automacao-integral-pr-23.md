# Automação integral da PR #23 — modo solo unificado

Atualizado em 22 de julho de 2026.

## Estado atual

**SOLO_READY_TO_PROMOTE**, condicionado à conclusão verde dos gates locais e remotos do HEAD publicado.

- PR canônica: [#23](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/23)
- Branch única: `codex/sprint-40-1-mobile-preview`
- HEAD inicial desta consolidação: `5484712555ab11d565e828d8f405f6bbd86b915c`
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

## Estado deste lote

- label `comun:promover`: não aplicada;
- migration remota: não executada;
- merge: não executado;
- deploy manual: não executado;
- domínio: não alterado;
- tag: não criada;
- escrita no Supabase remoto: nenhuma.

## Próxima ação manual

Após confirmar `COMUN_CI_GREEN` no HEAD remoto, o operador aplica uma única vez `comun:promover` na PR #23 ou dispara manualmente `COMUN Promote` informando PR e SHA exatos.
