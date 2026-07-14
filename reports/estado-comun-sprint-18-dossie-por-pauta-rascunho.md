# Estado COMUN Sprint 18 - dossie por pauta em rascunho

Data: 2026-07-07

## Objetivo

Criar o primeiro fluxo administrativo de rascunho de Dossie por Pauta, sem publicacao automatica, a partir de pauta social, evidencias seguras, protocolos oficiais sanitizados, sintese publica e tarefas.

## Banco de dados

Migration criada e aplicada:

- `supabase/migrations/20260707203422_pauta_dossier_drafts.sql`

Tabelas:

- `comun_pauta_dossiers`;
- `comun_pauta_dossier_evidence`.

RLS fica habilitado nas duas tabelas. `anon` e `authenticated` nao recebem acesso direto. A operacao passa por servidor/admin com service role.

## Helper de geracao

Criado:

- `lib/pauta-dossiers.ts`

Funcao principal:

- `generatePautaDossierDraft(pautaId)`

O rascunho usa apenas:

- pauta e sintese publica;
- evidencias `approved + public_safe`;
- relatos sanitizados;
- protocolos oficiais com campos seguros e `public_summary`;
- tarefas abertas.

Nao usa:

- `raw_text`;
- `private_contact`;
- `response_text` completo;
- `internal_notes`;
- signed URLs;
- `storage_path`;
- evidencia `private_only`.

## Admin

Criado menu:

- `/comun/admin/dossies`

Na pauta admin:

- `/comun/admin/pautas/[id]`

Foi adicionado o bloco `Dossie da pauta` com:

- criar rascunho;
- regenerar rascunho;
- abrir editor.

Editor:

- `/comun/admin/dossies/[id]`

Permite editar:

- titulo;
- status;
- sintese executiva;
- problema;
- comunidades afetadas;
- evidencias;
- protocolos oficiais sanitizados;
- demandas;
- proximos passos;
- versao publica em rascunho;
- notas internas.

Tambem permite:

- remover evidencia incluida;
- regenerar rascunho a partir da pauta;
- revisar checklist operacional de seguranca.

Preview admin:

- `/comun/admin/dossies/[id]/preview`

O preview exige admin e nao renderiza `internal_notes`.

## Auditoria

Actions auditadas:

- `pauta_dossier_created`;
- `pauta_dossier_regenerated`;
- `pauta_dossier_updated`;
- `pauta_dossier_evidence_removed`.

## Documentacao

Atualizados:

- `docs/pautas-sociais.md`;
- `docs/operacao-comun.md`;
- `docs/deploy-checklist.md`.

Rotina semanal documentada:

1. abrir `/comun/admin/dossies`;
2. revisar dossies `draft` e `in_review`;
3. aprovar novas evidencias quando necessario;
4. conferir evidencias `approved + public_safe`;
5. resumir respostas oficiais apenas por `public_summary`;
6. editar sintese, problema, demandas e proximos passos;
7. revisar preview admin contra vazamentos;
8. marcar `ready` apenas apos revisao humana;
9. arquivar quando o recorte nao estiver seguro.

## Smoke

Novo smoke:

- `scripts/smoke-comun-pauta-dossier-draft.mjs`
- `npm run smoke:pauta-dossier-draft`

Cobertura:

- cria pauta teste;
- cria evidencia publica segura;
- cria evidencia privada que nao entra no dossie;
- cria rascunho de dossie;
- vincula evidencia segura;
- edita rascunho;
- confirma editor e preview admin;
- confirma que notas internas nao vazam na pauta publica;
- limpa dados de teste.

## Verificacao local

Executados e aprovados:

- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- `npm run verify`;
- `npm run smoke:official-protocol`;
- `npm run smoke:official-protocols-admin`;
- `npm run smoke:pauta-spaces`;
- `npm run smoke:pauta-contribution-safety`;
- `npm run smoke:pauta-editorial-quality`;
- `npm run smoke:pauta-dossier-draft`;
- `npm run smoke:no-leak-http`;
- `npm run smoke:public-ui`.

## Limites

- O dossie ainda nao tem publicacao final automatica.
- O preview e somente admin.
- Checklist do editor e operacional, ainda nao bloqueia status automaticamente.
- Fluxo de revisao em duas pessoas fica para tijolo futuro.

## Proximo tijolo recomendado

Criar publicacao revisada de dossie por pauta com workflow de aprovacao, mantendo versao publica separada do rascunho interno.
