# Estado do COMUN — Sprint 21.1 — Verificação de produção do Acervo

Data: 2026-07-14

## Arquitetura e segurança

A verificação é executada por Server Action protegida por `requireComunAdmin({ roles: ["admin"] })`. O navegador envia apenas a confirmação explícita; R2 e Supabase são acessados no runtime da Vercel. Nenhum segredo, URL assinada, object key completa, token ou conteúdo da fixture integra a resposta.

Cada execução usa UUID novo, registros marcados `system_test=true` e o prefixo exclusivo `smoke/production-verification/{runId}/`. O banco possui lock parcial para apenas um run `archive_production` em estado `running`, cancelamento de lock stale após 30 minutos e limite de uma execução por hora.

## Etapas

O serviço cria uma imagem mínima em memória, valida escrita/HEAD/leitura temporária do R2 privado, checksum SHA-256, Sharp, thumbnail e display WebP sem metadados, R2 público, item/contribuição/assets, invisibilidade do draft, publicação, ausência do original no HTML, despublicação e ausência pública final. A limpeza de banco e dos três objetos ocorre em `finally` e confirma ausência por HEAD.

Existe fallback operacional com confirmação obrigatória e recusa de prefixos externos em `scripts/cleanup-comun-production-verification.mjs`.

## Verificação

- Migration aplicada localmente e no Supabase remoto.
- Supabase DB lint remoto: passou.
- Lint, TypeScript e build Next.js 16.2.10: passaram.
- Testes unitários: 10/10 passaram, incluindo sanitização, redaction, prefixo, stale lock e resumo seguro.
- Smokes de página protegida, ausência de vazamento HTTP, autenticação admin e UI pública: passaram em produção.
- Auditoria de dependências: nenhuma vulnerabilidade alta; duas moderadas transitivas do PostCSS/Next, sem uso de `--force`.

## Deploy

Deploy concluído e alias atualizado em `https://comunvrabandonada.vercel.app`.

## Gate real

Aprovado em produção em 2026-07-14. Duração total registrada: 6.528 ms. Etapas: storage privado 440 ms; processamento 6 ms; storage público 432 ms; banco 958 ms; publicação/despublicação 1.499 ms. O resultado final foi `passed` e o painel confirmou cleanup concluído. A confirmação pós-cleanup verificou por HEAD a ausência do original e dos dois derivados; os registros `system_test` foram removidos. Não restaram fixtures conhecidas da execução.

O acesso anônimo foi rejeitado antes do teste. O administrador `alexandrecampos@id.uff.br` foi cadastrado e o login de produção validado. A configuração Supabase da Vercel foi sincronizada com o projeto remoto vinculado sem exportar valores para o navegador ou relatório.

## Riscos restantes

O timeout depende dos limites da função Vercel. Uma interrupção dura pode impedir o `finally`; o lock stale e o cleanup operacional cobrem recuperação. O painel ainda exige acompanhamento humano de qualquer estado `cleanup_required`.

## Próximo tijolo recomendado

Executar o gate autenticado e, depois, evoluir o processamento de derivados para uma fila idempotente com tentativas e métricas.
