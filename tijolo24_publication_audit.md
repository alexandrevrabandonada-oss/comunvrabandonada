# Tijolo 24 - Auditoria de publicacao

Data: 2026-07-08

## Fluxo aceito

1. Preparar versao publica revisada.
2. Registrar revisao factual com usuario real.
3. Registrar revisao editorial com outro usuario real.
4. Aprovar dossie.
5. Salvar checklist final de publicacao.
6. Publicar criando snapshot imutavel.
7. Usar snapshot ativo na rota publica.
8. Superseder snapshot ativo quando nova versao for publicada.
9. Despublicar com motivo obrigatorio.
10. Fazer rollback criando novo snapshot a partir de snapshot anterior.

## Auditorias obrigatorias

- Criacao de snapshot: `dossier_publication_snapshot_created`.
- Supersede de snapshot anterior: `dossier_publication_snapshot_superseded`.
- Despublicacao com motivo: `dossier_unpublished_with_reason`.
- Rollback: `dossier_publication_rollback_created`.
- Checklist final salvo: `dossier_publication_final_checklist_saved`.
- Bloqueio por checklist incompleto: `dossier_publication_blocked_final_checklist`.
- Diff visualizado: `dossier_publication_diff_viewed`.

## Resultado

O fluxo local criou, trocou, despublicou e restaurou snapshots sem alterar a regra de nao exposicao publica de dados internos.

## Fechamento R1

Aceite local executado em `http://localhost:3000`.

Confirmado:

- migration de snapshots existe;
- publicacao cria snapshot;
- rota publica usa snapshot ativo;
- editar rascunho nao altera publicacao;
- nova publicacao marca anterior como `superseded`;
- despublicacao exige motivo;
- rollback restaura snapshot anterior seguro;
- admin mostra historico de publicacao;
- admin mostra comparacao rascunho x snapshot.
