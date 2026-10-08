# Quality remoto após merge: escopo e evidência

O #525 alterou somente `tests/quality-performance/quality.spec.ts`. O classificador de build existente ignora esse delta em Production. O Quality remoto aguardou o SHA `092a4afa965c6427f1b1980a0d87e9e483af8d06` por 30 tentativas e falhou no job `113451932296` com `COMUN_QUALITY_EXPECTED_SHA_NOT_DEPLOYED`. A falha permanece no histórico; o PASS do candidato não certifica esse merge em Production.

O workflow passa a consultar a mesma classificação de impacto usada pelo build antes do ensaio remoto automático. Apenas `IGNORE/no-runtime-allowlist`, com contexto push/main válido e diff disponível, produz `COMUN_QUALITY_REMOTE_NOT_APPLICABLE_NO_RUNTIME`. O job remoto fica skipped: não há PASS, certificação de Production ou reaproveitamento da versão anterior.

Delta vazio, diff indisponível, arquivo desconhecido, runtime, migration, dependência ou configuração exigem o caminho remoto original. Contexto inválido falha. `workflow_dispatch` no modo `full` sempre exige o ensaio explícito. O SHA exato, o preflight e a verificação read-only do schema permanecem obrigatórios quando o job remoto executa.

A classificação não aplica migrations, não emite reload, não muda flags e não promove deploy. Os testes verificam decisões de escopo e o protocolo de output; o CI do candidato continua executando os laboratórios existentes. A mudança exige Preview próprio e validação pós-merge antes de afirmar operação pública.
