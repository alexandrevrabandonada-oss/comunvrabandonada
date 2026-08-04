# COMUN Tijolo 48.0I — diagnóstico

## Baseline

- `origin/main`: `3beab754d99ab2048430a5124960b960cbf4a518` (descendente legítima do 48.0H).
- Branch local de trabalho: `codex/tijolo-48-0i-fiscaliza-operational-observation`.
- Production observado read-only: `/comun=200`, `/comun/relatar=200`, `/comun/relata=404`, `/comun/onibus=404`, forwarding dormente.
- Não houve consulta/escrita no Supabase remoto, migration remota, flag pública ou submissão externa.

## Fontes observadas

- Geral atual: [Carta de Serviços 435](https://servicos.voltaredonda.rj.gov.br/cartaServicos/435/) — atendimento ininterrupto, cadastro, protocolo e acompanhamento; prazo geral `not_stated`.
- Iluminação atual: [Carta de Serviços 158](https://servicos.voltaredonda.rj.gov.br/cartaServicos/158/) — Secretaria Municipal de Infraestrutura, nome/contato, rua/número/referência e previsão de realização de 30 dias; estimativa de execução, não prazo legal.
- Histórico 2019: [notícia municipal](https://www.voltaredonda.rj.gov.br/cidade/27-noticias-em-destaque/seplag/818-fiscaliza-vr-facilita-atendimento-ao-cidad%C3%A3o/) — menção histórica a resposta inicial em até 48 horas; não é prazo atual e não promove anonimato.

## Observação pública

O endereço municipal `https://www.voltaredonda.rj.gov.br/fiscalizavr` redirecionou para `fiscalizavr.citysystems.com.br`, cujo DNS não respondeu (`DNS_PROBE_POSSIBLE`). Não houve login, preenchimento, CAPTCHA, criação de ocorrência ou clique de submissão. O estado máximo registrado é `operationally_observed_no_submission`, com entrada externa indisponível e autenticação não observada.

## Infraestrutura local

- Supabase CLI via `npx`, PostgreSQL 17 em stack descartável (portas compartilhadas 56431–56439 durante o ensaio; configuração restaurada para 55431–55439).
- Um reset inicial falhou por conflito de porta e duas tentativas por inicialização concorrente; `supabase stop --no-backup` + `supabase start` recuperou a stack e o reset integral passou.
- Nenhum segredo, cookie, token ou screenshot com PII foi persistido.

Resultado diagnóstico: `COMUN_FISCALIZA_OPERATIONAL_OBSERVATION_PARTIAL`.
