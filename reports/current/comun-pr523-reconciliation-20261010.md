# PR #523 — reconciliação isolada em 10/10/2026

Draft preservado. Head remoto anterior `cf0e8e41a084e073a728cca269a0dbc38683bfe1`;
main consultada `400b17b350a00de913b6e802586c890c1e2999d9`.
Merge local normal `d371bc6c247bcb6600e6e81c11652bbdb20a13dc`, tree
`83656ebd0ddb67d80a7682fc02ed3f6de5acae5c`. Conflito documental do roadmap
resolvido preservando ambas as histórias e os bloqueios. Nenhum conflito runtime.
Árvore original do usuário preservada; trabalho em worktree isolada no E:.

## Correções demonstradas

- Preload ESM recebia caminho Windows e falhava com `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
  O teste agora utiliza `pathToFileURL`, sem alterar o runner de produto.
- Fixture shell selecionava Bash WSL e Node Windows ignorava o stub Git sem extensão.
  Seleção explícita de Git Bash e preload limitado à chamada Git exata preservam
  a matriz positiva/negativa. Linux mantém seu caminho anterior.
- Inventário SOLO recusava oito workflows reais já revisados de Escola/compartilhamento.
  Registrados nominalmente; workflows desconhecidos continuam falhando. Nenhuma
  lane, permissão ou regra de execução foi alterada.
- Build inicial falhou pelo node_modules compartilhado por junction deste ensaio.
  Dependências instaladas pelo lockfile na própria worktree; build posterior PASS.

## Provas locais

Executadas sobre o merge acima mais os três helpers de teste e a documentação
descritos neste relatório. Manifesto sanitizado adjacente registra hashes dos logs
privados e dos arquivos efetivamente testados, sem incluir logs ou dados reais.

| Comando                                                       | Resultado                                         |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `npm ci --ignore-scripts`                                     | PASS                                              |
| `npm run test:unit`                                           | PASS: 1.509 testes / 253 arquivos                 |
| `node --test` nos helpers Windows e COST-01/COST-02           | PASS: 45, zero SKIPPED                            |
| `npm run solo:test`                                           | PASS: 113, zero SKIPPED; falha inicial preservada |
| `npm run build`                                               | PASS: Next 16.3.8, instalação isolada             |
| `npm run typecheck`                                           | PASS, tipos gerados pelo build atual              |
| `npm run lint`                                                | PASS                                              |
| `npm run db:privileges:lint`                                  | PASS: contrato explícito de 55 migrations         |
| SQL forward-only com os três manifests explícitos do COMUN CI | Resultado no manifesto                            |
| Prettier e `git diff --check`                                 | PASS                                              |

## Limites e bloqueios

Head remoto anterior: 45 SUCCESS, 76 SKIPPED, seis FAIL; Quality passou.
Seis preflights continuam dependentes do schema Escola: 48.2-A, 48.3-A1,
48.3-C1, 48.3-D1, 48.3-E2 e 48.3-E3. Não dispensados nem tratados como verdes.
Novo SHA precisa de checks/Preview exatos; resultados remotos antigos não são
transferidos ao novo checkpoint. Aparelhos reais, Safari/Firefox e ensaio humano
NOT_RUN nesta continuação.

A invocação SQL sem manifest recusou corretamente zero releases alteradas
(`SOLO_RELEASE_MANIFEST_COUNT_INVALID`). Não foi tratada como PASS nem corrigida
por flexibilização; a verificação aplicável usa as três releases nomeadas pelo CI.

`npm audit` reportou 12 findings (10 high, 2 moderate), incluindo dependências
diretas e transitivas; package.json/lockfile são idênticos à main consultada.
Isso é uma frente de manutenção existente a revisar separadamente; não aplicar
`audit fix --force` ou downgrade sugerido do Next para mascarar o resultado.

Migration Escola e manifest inalterados. Recuperação externa integral continua
NOT_CERTIFIED, backup expirado e nenhum permit de schema emitido. Zero escrita
Production, sem flags, indexação ou merge final. V1 e Escola não certificadas.
