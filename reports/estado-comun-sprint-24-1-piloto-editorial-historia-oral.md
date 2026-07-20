# Estado do COMUN — Sprint 24.1

Data: 14/07/2026. Ambiente: local + Supabase/Vercel de produção. Piloto real: **não iniciado (0 entrevistas)**.

## Resultado executivo

A fundação técnica foi transformada em operação editorial administrável: templates versionados, revisão qualificada, consentimento em duas etapas, sessões de explicação, plano/checklist, custódia, painel de transcrição manual, dupla revisão, terceiros, aprovação final, fila, SLOs e alertas. O gate técnico específico passou com fixtures descartáveis. O gate humano permanece fechado de propósito; não houve convite, gravação ou dado pessoal real.

## Regressão técnica somente leitura

- GitHub Actions `archive-processing-scheduler.yml`: runs agendados `29372993597`, `29368585653` e `29363581308`, branch `main`, concluídos com sucesso.
- Heartbeats correspondentes no Supabase: `passed`, origem `scheduler`; o mais novo iniciou em `2026-07-14T22:26:35.038Z`.
- Fila ativa: 0; retries do heartbeat mais novo: 0; dead-letter: 0; alertas críticos ligados ao scheduler: 0.
- Nenhuma alteração em cron, secrets, endpoint, storage ou arquitetura da fila.

## Governança e operação

- Templates: tabela versionada, estados e trigger que rejeita template não aprovado/retirado.
- Revisão do termo: registro administrativo de responsável/referência, versão, pendências, decisão e próxima revisão. Nenhuma revisão jurídica real foi inventada.
- Consentimento: `initial` e `publication_final` separados; apresentação, método, pessoa registradora, validade, expiração, histórico e renovação registrados.
- Sessões: pré-entrevista, pós-edição, renovação e retirada, com confirmação de compreensão e escopos; perguntas/evidências são privadas.
- Preparação: plano e checklist mínimo de dez itens; menores e risco alto/excluído ficam fora do piloto.
- Custódia/backup: eventos sanitizados; object key, URL, contato e localização são proibidos em metadata. Original exige escopo privado; publicação exige checksum e backup quando há original.
- Transcrição: painel em `/comun/admin/acervo/historias-orais/transcricoes/trabalho`, rascunho manual, métricas sem ranking e revisões separadas de fidelidade e risco.
- Terceiros: estados de revisão, risco, contextualização/restrição/remoção e revisão jurídica; pendência bloqueia publicação.
- Aprovação: decisão final por participante/superfície, incluindo parcial, expiração, alterações, negação e retirada. Silêncio não autoriza.
- Prévia: não foi aberta superfície externa com token. Decisão conservadora: PDF privado e envio manual registrado.
- Fila: `/comun/admin/acervo/historias-orais/piloto`, com responsável, idade/SLO, bloqueios, próxima ação e risco.

## SLO, alertas e métricas

SLOs implementados: contato 5 dias úteis; upload 24h; backup 48h; transcrição 21 dias; revisão 14 dias; envio ao participante 7 dias; retirada pública imediata e conclusão administrativa em 5 dias úteis. Eles geram atenção e não alteram conteúdo automaticamente.

Alertas deduplicados por entidade/condição: `oral_history_recording_without_backup`, `oral_history_transcription_stalled`, `oral_history_editorial_review_overdue`, `oral_history_participant_approval_pending`, `oral_history_consent_template_outdated`, `oral_history_legal_review_required`, `oral_history_withdrawal_overdue` e `oral_history_third_party_claim_pending`.

A fila agrega contagens por etapa sem ranking individual. Duração, esforço editorial, revisões, alterações, restrições, terceiros e retiradas ficam disponíveis nos registros administrativos.

## Exercícios e segurança

O smoke editorial criou e aprovou template fixture, registrou explicação e consentimento inicial, plano, original privado lógico, checksum/backup, transcrição, alegação pendente e resolução, versão pública, aprovação final, publicação, retirada, expiração e renovação. Confirmou 404 após retirada e fez cleanup. O smoke de História Oral confirmou R2 real, original privado, texto/áudio seletivos, embargo, retirada e cleanup.

- Migração `20260714231050_archive_oral_history_editorial_pilot.sql` aplicada local e remotamente.
- RLS habilitado e grants anon/auth revogados nas oito tabelas; matriz final `RLS_MATRIX_OK`.
- `supabase db lint --local` e `--linked`: sem erros.
- Nenhuma fixture remota restante após os smokes.
- Página pública exige consentimento `publication_final`; não há URL assinada, original, termo, transcrição interna ou alegação privada no HTML público.

## Testes, deploy e custos

- `npm ci`, lint, typecheck, 65 unitários e dois builds: passaram.
- Playwright: 36 passaram, 3 foram ignorados deliberadamente após limitar o login admin a um viewport; a única tentativa ainda falhou no ambiente local porque a credencial de produção não existe no Supabase local. Todas as rotas públicas de História Oral passaram em 360, 390, 768 e 1366 px, sem violação séria/crítica de acessibilidade.
- Smokes de produção: editorial, História Oral/R2, fundação, não vazamento, admin auth e UI pública passaram.
- `npm audit --audit-level=high`: passou no limiar; 2 moderadas transitivas em PostCSS/Next permanecem. O único reparo sugerido é breaking/downgrade e `--force` não foi usado.
- Deploy Vercel: sucesso e alias `https://comunvrabandonada.vercel.app` atualizado.
- Custo incremental observado: R$ 0; apenas uso dentro das cotas atuais de Supabase, Vercel e R2. Não há fornecedor de transcrição.

## Gates

Gate técnico: **aprovado para fixtures e operação administrativa**, com migração, RLS, retirada, expiração, renovação, cleanup, não vazamento e produção verificados. A suíte E2E autenticada local continua limitada pela ausência do usuário admin no banco local; isso não afetou o smoke autenticado de produção.

Gate humano: **fechado**. Pendências reais: termo revisado por profissional qualificado; responsáveis nomeados; entrevistadores orientados; política/cópia secundária validada por responsável; canal de retirada confirmado; roteiro e checklist formalmente aprovados.

## Riscos e próximo tijolo

Não iniciar o piloto real antes do fechamento documentado do gate humano. Depois disso, cadastrar um template real aprovado e executar **uma** entrevista adulta de baixo risco, acompanhada de revisão humana completa antes de considerar a segunda. Não expandir volume nem introduzir transcrição externa nesta etapa.
