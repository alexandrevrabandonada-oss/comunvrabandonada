# 49-E3 — usar, participar e aprender a organizar

Base: main `b9c78c2c5c0affc5ee452010da0185747534eae9`.
Implementação e certificados do SHA exato: [PR #544](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/pull/544).
Branch: `codex/comun-49e-entry-20261013`.

## Comportamento do produto

Home canônica, home legacy pública e Participar reutilizam os mesmos três caminhos:
usar fontes/busca, participar de ações existentes e aprender a organizar.
O terceiro caminho abre uma seção da orientação pública existente e oferece
consulta a comunidades, com retorno pelo navegador e endereço favoritado.

A entrada não armazena identidade, progresso, inscrição, tarefa ou responsabilidade.
A orientação informa seu limite: não cria nem administra núcleos e abrir uma
comunidade não atribui vínculo ou papel. É uma etapa 49-E0/E em direção a 49-M;
governança de núcleos e formação permanente completa seguem no roadmap.

## Contrato A7 e Escola pendente

O candidato anterior `e2cdc0e2e838fdeba22dd17b487cff20f05edbc3` passou a captura de
metadados A7 com TLS verificado e falhou corretamente no contrato então global:
`REMOTE_MIGRATION_PLAN_NOT_EMPTY:20261006134804_comun_learning_r0.sql`
(run `38413365663`). Essa falha histórica não foi convertida em PASS.

A validação específica A7 agora aceita plano vazio, ou exatamente essa única
migration Escola já classificada `not_applicable` para A7. Exige os bytes canônicos:

- SQL: `5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7`.
- Manifest: `3b598bc6b3ea3dfe462ba205b6747016aace52de87c87dec332ecbb1a567d4de`.

O manifest continua com `remotePromotionAllowed=false`. O plano preserva
explicitamente `unrelatedPendingMigration=20261006134804_comun_learning_r0.sql`;
não declara plano global vazio nesse caso. Outra migration, duplicidade, bytes
alterados, marcadores contraditórios, saída incompleta, falha do CLI ou operações
de escrita bloqueiam.

A inspeção de raízes/RLS A7, o ledger Hardening e seus fingerprints continuam
obrigatórios. Subprocessos usam TLS verificado e
`default_transaction_read_only=on`; o único comando de planejamento é
`supabase db push --dry-run`. A migration Escola permanece no diretório durante
esse comando. Apenas os dois arquivos externos já reconciliados são
temporariamente isolados e sempre restaurados.

O código novo pertence a arquivos próprios do A7. O planner compartilhado e seus
testes permanecem byte-identical à main, preservando o contrato das outras frentes.

## Provas

- PASS local: 5 contratos do validador A7 e 17 cenários do passo Bash real com
  executores descartáveis de psql/CLI, sem banco remoto. Incluem stdout/stderr,
  School pendente explícita, ledger ausente/drift, exit não zero, duplicidade,
  migration adicional, bytes alterados, saída inválida e validador ausente.
- PASS local: 8 contratos da CA/TLS e isolamento dos passos read-only.
- PASS local: 14 contratos dos workflows históricos com o planner compartilhado
  original e o novo passo A7. Os gates remotos do SHA exato são registrados no PR;
  skipped não equivale a PASS.
- As provas anteriores de produto (29 focais, 10 Chromium, lint/TypeScript/build)
  pertencem ao candidato anterior. CI, Experience Coherence, Preview e COST-02
  precisam comprovar o novo SHA após a sincronização com main.

## Findings e limites preservados

O primeiro candidato falhou por CA ausente antes da consulta; o pin existente da
CA pública com verify-full foi mantido. Um teste confundiu Web Vitals com escrita
de participação; o sink local allowlisted continua permitindo somente os seis
campos não pessoais de quality-metrics, mantendo outras escritas bloqueantes.
As falhas EBUSY do ambiente Windows continuam históricas; Linux é verificado
separadamente.

Aparelhos reais, Safari/Firefox, leitor de tela humano e ensaio de compreensão:
NOT_RUN. Não existe prova de RLS nova, pois esta entrada não altera runtime,
política ou escrita. #523/#542 continuam independentes. Sem migration nova,
repair de histórico, Auth, segredo, backup, dado Production, flag ou indexação.
Esta entrega não encerra V1 nem certifica organização real.


A run A7 `38451165090` do SHA `a90c8d65` passou os cinco contratos do
validador e falhou no loader do ensaio por `ERR_MODULE_NOT_FOUND: js-yaml`.
A consulta remota não foi executada. O ensaio passou a extrair diretamente o
bloco Bash literal conhecido, mantendo o job sem instalação de dependências;
a falha anterior permanece registrada.
Os 20 contratos A7 passaram novamente com a mesma chamada node --test do job,
sem parser YAML ou instalação npm.

A run V1 `38451660368` do SHA `ee9a0d13` passou o build e recusou
`git diff --check` por linha vazia extra no EOF do teste A7. A formatação foi
corrigida e o diff local verificado; o finding anterior não é contado como PASS.

A revisão final incluiu nomes legados e não canônicos no bloqueio de qualquer
SQL adicional. A saída contraditória “up to date” acompanhada de um arquivo legado
também é recusada. Diagnósticos do validador específico mostram somente a contagem
de arquivos, sem reproduzir nomes desconhecidos ou dados de conexão.
PASS local final: 22 contratos A7, reexecução focal do workflow histórico A7 e
git diff --check. Os outros 13 workflows mantêm os arquivos anteriormente testados.
