# Checkpoint do fechamento definitivo — Sprint 37.2

Data: 20 de julho de 2026

## Código e banco local

| Item | Evidência sanitizada |
|---|---|
| Branch | `codex/sprint-37-mapa-real-calcadas-local` |
| HEAD inicial | `8f999a798f2d1818920dccda7e26570be78da6bf` |
| Git status inicial | limpo |
| Migrations | 58 arquivos SQL locais |
| Supabase | stack exclusivamente local ativa |

## Processos e portas

| Item | Estado no checkpoint |
|---|---|
| Docker Desktop | ativo |
| Supabase API | porta local `55431` escutando |
| Supabase Postgres | porta local `55432` escutando |
| Supabase Studio | porta local `55433` escutando |
| Supabase Mailpit | porta local `55434` escutando |
| Next | nenhum processo deste worktree na porta `3000` |
| Outros processos Node | presentes, sem vínculo com este worktree e não encerrados |

## Estado das fixtures

O comando oficial `npm run test:fixtures:assert-clean` concluiu com
`COMUN_TEST_FIXTURES_CLEAN`.

| Escopo | Estado |
|---|---|
| Usuários e perfis fixture | zero residual detectado |
| RunId ativo | nenhum manifesto `.local/comun-auth/current.json` |
| Storage states | nenhum arquivo residual detectado |
| Fixture integral local | nenhum arquivo residual detectado |
| Objetos de Storage de teste | zero residual segundo o contrato `assert-clean` |

## Relatórios de entrada

- `reports/estado-comun-sprint-37-2-encaminhamento-memoria-local.md`;
- `reports/release-readiness-sprint-37-2.md`;
- `reports/comun-diagnostico-encaminhamento-calcadas-sprint-37-2.md`;
- `reports/estado-atual-projeto-sprint-37-2026-07-20.md`;
- `reports/comun-fechamento-integral-calcadas-sprint-37.md`;
- `reports/comun-go-no-go-calcadas-sprint-37.md`.

## Limite comprovado na entrada

O E2E integral existente percorre fotografia, observação, prioridade,
encaminhamento, protocolo, resposta, resultado e memória no mesmo ciclo. Porém,
as ações editoriais especializadas ainda são executadas por uma única conta
administradora. Portanto, o marcador da matriz das oito personas ainda não é
emitido neste checkpoint e não será presumido.

## Declarações obrigatórias

- Piloto público: **NÃO ABERTO**
- Integração principal: **NÃO EXECUTADA**
- Push: **NÃO EXECUTADO**
- Deploy: **NÃO EXECUTADO**
- Supabase remoto: **NÃO ALTERADO**
- R2 real: **NÃO UTILIZADO**
- Tiles remotos: **NÃO UTILIZADOS**
- Dados reais: **NÃO UTILIZADOS**
- Protocolos reais: **NÃO ENVIADOS**
- Custo externo: **R$ 0**

