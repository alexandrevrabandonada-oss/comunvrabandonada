# Content Security Policy

A aplicacao envia uma politica `Content-Security-Policy-Report-Only`. Ela limita origens de imagens ao proprio site e ao host configurado em `R2_PUBLIC_BASE_URL`, e conexoes ao proprio site e ao host do Supabase.

Antes de trocar para modo de bloqueio:

1. acompanhe violacoes no navegador e na observabilidade do ambiente;
2. confirme imagens do acervo, autenticacao, formularios e painel administrativo;
3. remova fontes desnecessarias e adote nonces para reduzir `unsafe-inline` e `unsafe-eval`;
4. valide novamente em preview e producao.

O cabecalho atual e deliberadamente report-only para evitar regressao silenciosa durante a ativacao do R2. A URL publica do R2 tambem e adicionada ao `next/image` somente quando a variavel existe.
