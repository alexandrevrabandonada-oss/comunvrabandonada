# Diagnóstico do Storage local — Sprint 29.1

Data: 15/07/2026.

## Versões e topologia

- Supabase CLI: 2.109.1.
- Storage API: 1.62.5.
- PostgreSQL: 17.6.1.
- Docker Engine: 29.2.1.
- API local: `http://127.0.0.1:55431`.
- Banco local: porta 55432.
- Storage: backend `file`, container saudável.

O schema oficial possui `storage.buckets`, `storage.objects`, tabelas multipart/vector e 17 funções. Após inicialização completa, `storage.search`, `storage.search_v2` e as migrations oficiais até `optimize-existing-functions-again` estão presentes.

## Causa comprovada

O erro não era causado pelas migrations de produto. Durante `supabase db reset --local`, o banco é reconstruído e o Storage reinicia em outro endereço da rede Docker. Em duas reproduções, o Kong reteve o IP anterior do container Storage; seus logs registraram `connect() failed (111: Connection refused)` para o upstream antigo e devolveram 502. Em uma janela anterior, a Storage API também consultou `storage.search` antes de o schema oficial terminar de reaplicar, retornando PostgreSQL 42883.

Classificação: desalinhamento temporal CLI/container e cache de upstream do gateway depois do reset. Não é policy, bucket nem ausência permanente de função.

## Solução

- buckets declarados em `config.toml` e migration idempotente;
- readiness real que lista buckets pela Storage API;
- quando o reset troca o IP e mantém 502, reinício restrito ao container Kong deste projeto;
- nenhuma alteração arbitrária no schema oficial `storage`;
- provider recusa URL fora de localhost.

## Prova mínima

O gate criou/validou buckets, enviou JPEG real, fez download/HEAD server-side, bloqueou acesso público ao original, gerou três WebPs com Sharp, acessou derivadas públicas, removeu os objetos e confirmou zero fixtures. O ciclo foi aprovado duas vezes a partir de reconstruções independentes; a segunda exigiu o restart limitado do gateway antes do readiness.

O arquivo `.env.local` existente contém URL remota e não foi alterado. Todos os comandos da sprint sobrescreveram as variáveis por processo com localhost. Nenhuma operação de banco ou Storage remoto foi executada.
