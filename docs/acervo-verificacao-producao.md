# Verificação de produção do Acervo

A verificação roda dentro da aplicação porque somente o runtime da Vercel recebe os segredos sensíveis. Ela exige administrador autenticado, confirmação explícita, aceita uma execução por hora e impede concorrência por lock no Supabase.

O teste cria uma imagem técnica mínima em memória, registros marcados `system_test=true` e objetos exclusivamente sob `smoke/production-verification/{runId}/`. Valida R2 privado, leitura temporária, Sharp, derivados WebP, R2 público, banco, publicação e despublicação. Um bloco `finally` remove registros e objetos e confirma a ausência final.

Frequência recomendada: após mudanças de storage/processamento ou antes de uma release relevante. Em `cleanup_required`, tente novamente com o procedimento administrativo. O script `scripts/cleanup-comun-production-verification.mjs` é fallback e exige confirmação e run ID; ele recusa qualquer prefixo diferente.

Nunca copie secrets da Vercel. Para confirmar ausência de vazamento, rode o smoke externo, a auditoria HTTP e verifique que HTML, logs e auditoria contêm apenas nomes de etapas, durações e estados.
