# Release readiness — Sprint 37

## Evidência executada

- instalação determinística: concluída (`npm ci`; 2 vulnerabilidades moderadas registradas, sem `audit fix` automático);
- reset local 1 e migrações: aprovado;
- E2E integrado em desenvolvimento: 15/15, cinco viewports;
- reset local 2, lint do banco, matriz RLS e persistência: aprovados;
- testes unitários: 223/223 em 37 arquivos;
- E2E após segundo reset: 15/15;
- build: aprovado; `/comun/admin/operacao` confirmado dinâmico;
- production-like público: aprovado;
- production-like autenticado: **reprovado** — após cadastro e acompanhamento, o Server Action de contribuição retornou página genérica de erro; o erro de senha também não apresentou a mensagem esperada.

Suites históricas de comunidades, PWA, calçadas e participação não foram reexecutadas isoladamente nesta sprint; sua cobertura residual está representada pelo teste integrado e pelas evidências anteriores, sem alegar nova execução.

Status técnico: **NO-GO** até corrigir e repetir o percurso autenticado em `next start`.

Declarações: piloto **não aberto**; integração na `main`, push e deploy **não executados**; Supabase remoto **inalterado**; R2 real/dados reais **não utilizados**; custo externo **R$ 0**.
