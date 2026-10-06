# Rádio: candidato de contrato transacional de publicação

Este recorte reconcilia a identidade editorial da PR #436 com a base da PR #506. O SQL permanece em `supabase/reconciliation/radio-publication`, fora de migrations e sem chamada pela aplicação. Ele não comprova instalação ou ativação no schema canônico.

O digest cobre episódio, asset, direitos, consentimentos, créditos, música, revisão de segurança e conteúdo da transcrição. O commit serializa as tabelas participantes, recalcula o digest e o checklist, rejeita revisão obsoleta com auditoria e grava episódio, raiz pública, versão editorial e auditoria na mesma transação. Falha em qualquer escrita deve reverter a publicação inteira.

Diferenças do candidato histórico:

- Todas as funções são `SECURITY INVOKER` com `search_path=pg_catalog`; chamadas e objetos de outros schemas são qualificados. Os helpers privados recebem apenas os grants necessários para `service_role`; as RPCs não são executáveis por `anon` ou `authenticated`.
- O limite de duração é de 1.800 segundos, conforme o perfil atual. Direitos do asset integram o digest e exigem licença autorizada. Consentimentos futuros, vencidos ou com retirada solicitada/concluída bloqueiam.
- A RPC impõe um administrador ativo com papel admin/editor, obtido pela aplicação autenticada quando houver integração. O contrato não cria contas operacionais reais.

A prova usa PostgreSQL 17 descartável, com as tabelas, constraints, índices, triggers, RLS e grants da migration canônica da Rádio. As dependências de Acervo, Auth e chaves estrangeiras são fixtures mínimas. Há controles positivos, permissões, bloqueios editoriais, concorrência entre conexões com barreira de lock observada e falha injetada depois das primeiras escritas para comprovar rollback. As fixtures ficam no banco exclusivo `comun_radio_contract`; o runner recusa host externo, outro nome de banco e banco não vazio. O serviço é destruído ao fim do job.

Execução: definir `COMUN_RADIO_CONTRACT_DATABASE_URL` para o banco local descartável e executar `node scripts/radio-publication-contract.mjs`. Não usar uma conexão do ambiente canônico.

Restam antes de ativação: validação na cadeia canônica completa, revisão de impacto dos locks globais, geração da migration forward-only, plano/checks de ownership, verificação do alvo e implantação de schema e aplicação compatíveis. Nenhuma amostra humana é necessária para essas provas técnicas; direitos, consentimentos e curadoria reais permanecem requisitos editoriais distintos.
