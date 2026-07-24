# Tijolo 42.1 — preflight da pauta canônica

Atualizado em 24 de julho de 2026.

## Escopo

- slug consultado: `calcadas-em-circulacao`;
- operação autorizada: somente leitura;
- campos pretendidos: quantidade, `visibility`, `status` e contagem de módulos;
- conteúdo privado, IDs e campos editoriais internos: não consultados para o
  relatório.

## Resultado

Classificação: `DATABASE_QUERY_FAILED`.

O conector Supabase recusou a execução por falta de permissão antes de executar
o SQL. A configuração `.env.local` do worktree aponta para a stack local e não
foi usada como se fosse produção. Portanto, este relatório não presume
`MISSING_ROW`.

Evidência pública complementar:

- a rota de produção da pauta respondia HTTP 404;
- o Mapa das Calçadas respondia HTTP 200 e continha link para a pauta;
- nenhuma escrita remota foi executada.

## Regra de segurança adotada

O hotfix não depende da classificação presumida. A aplicação consulta o slug
com sucesso antes de decidir:

1. registro público real: usa o registro;
2. zero registros: usa o fallback editorial;
3. registro privado ou arquivado: não usa fallback;
4. falha de consulta: registra `COMUN_CANONICAL_PAUTA_QUERY_FAILED` e não usa
   fallback.

Nenhuma migration, fixture ou registro remoto foi criado.
