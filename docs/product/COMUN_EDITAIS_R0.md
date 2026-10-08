# COMUN Editais — contrato R0 e caminho até protocolo verificável

Status: **candidato em PR, não disponível em produção** (08/10/2026).
Frente: extensão futura de 49-M (organização e capacidade institucional), sem declarar a V1 encerrada.
Organização-piloto pretendida: APS. A razão social, representantes e CNPJ **não são inferidos nem gravados no código**.

## Objetivo de produto

Reduzir burocracia sem apagar a autonomia da entidade: descoberta de editais →
triagem com fonte → elegibilidade comprovada → elaboração com memória institucional →
revisão e autorização → preenchimento → envio permitido → recibo oficial →
acompanhamento e prestação de contas.

O fluxo deve funcionar como uma ferramenta independente; nenhuma pessoa precisa
entrar em núcleo, aceitar atribuições políticas ou publicar informações da
associação para preparar um edital.

## Escopo efetivamente implementado no R0

- Rota privada: /comun/admin/organizacao/editais
- Proteção: sessão COMUN com papel admin ou editor E flag de servidor
  COMUN_EDITAIS_R0_ENABLED=enabled. Por padrão fica OFF.
- Bancada local (browser, sem API): campos básicos digitados, texto público
  colado do edital, dez pistas de verificação, campo para indicar referências
  documentais e dossiê preliminar copiável.
- O detector identifica apenas **palavras ou expressões possivelmente relevantes**.
  Não deduz obrigatoriedade, elegibilidade, dispensa, prazos reais ou aprovação.
- A saída sempre declara **rascunho local, elegibilidade indeterminada, não
  enviado e sem protocolo**. Nenhum campo de orçamento é inventado.
- Os dados não são persistidos em banco, storage, logs, analytics ou filas por
  esta funcionalidade; fechando a página perde-se o trabalho. Não cole documentos
  pessoais, senhas, dados bancários, CPF ou outros conteúdos privados.
- Este R0 não recebe PDF, não conecta Google Drive, não chama modelos de IA, não
  dispara automação de navegador, não cria registro de inscrição e não envia.

Os limites acima são intencionais para que um primeiro piloto não seja
confundido com inscrição pronta. Não há razão para ativar a flag em Production
antes da prova local, revisão de privacidade e autorização de rollout.

## Próximos tijolos

### R1 — dossiê institucional privado + elegibilidade auditável

Reutilizar identidade e acesso a organizações já presentes no COMUN; **não**
usar o perfil público como repositório de documentos confidenciais. Criar
armazenamento privado segregado por organização e RLS, com autorização do
representante, versionamento, validade, finalidade de uso, auditoria de acesso
e opção de exclusão. Nenhum CNPJ, CPF, login, token, contato ou endereço
privado no bundle do cliente, logs, SEO ou URL.

Importar edital oficial (PDF nativo, HTML ou arquivo permitido) com versão,
hash, origem, anexos e retificações. Extrair requisitos com referências
explícitas a página e cláusula. Um agente pode sugerir regras e campos, mas
deve registrar incerteza. Decisão de elegibilidade exige regra verificável,
evidência correspondente e conferência autorizada; ausência de prova é
**indeterminado**, jamais "apto".

### R2 — geração de proposta e orçamento com rastreabilidade

Biblioteca de projetos (ex.: SEMEAR), objetivos, histórico, evidências,
atividades, metas, cronograma, equipe e rubricas. Usar dados aprovados da
organização e das fontes citadas, sem inventar resultados ou currículos.
Associação entre campo do edital → texto proposto → evidência → versão.
Orçamento submetido a restrições, limites, soma das rubricas e verificação
humana. Mudança em qualquer entrada invalida a aprovação anterior.

### R3 — conectores para inscrição, com aprovação prévia

Cada portal terá um adaptador allowlisted com teste em ambiente próprio.
Dar preferência a API oficial **quando ela aceitar submissão**; APIs de
consulta não equivalem a permissão para escrever. Navegador automatizado
somente conforme regras e capacidades do portal; nunca contornar CAPTCHA,
duplo fator, assinatura eletrônica ou limitação de acesso.

Separar no banco os estados:

  oportunidade encontrada → análise pendente → elegível comprovada
  → proposta em rascunho → revisão pendente → aprovação assinada
  → pronto para submeter → tentativa de envio
  → recibo oficial conferido → resultado acompanhado

Uma tentativa de envio, HTTP 200, tela de "sucesso" ou rascunho salvo
**não são equivalentes** a inscrição protocolada. O estado protocolado
depende de comprovante oficial persistido com data, fuso, ID e hash.
Falhas de navegação entram em estado explícito; não presumir sucesso.

A autorização de envio deve identificar organização, edital, versão e hash
da proposta/anexos, portal, responsável e prazo de validade; não deve ser
reutilizada para uma versão diferente. Envios externos devem ser idempotentes
quando a plataforma permitir, com prevenção de duplicidades e confirmação
humana antes de operações irreversíveis.

### R4 — monitoramento e acompanhamento

Radar diário de editais (fonte oficial, inscrições abertas, retificações,
encerramentos); pontuação por relevância/impacto e **elegibilidade demonstrada**
sem transformar avaliação heurística em autorização para enviar. Lembretes
de prazos, pedidos de complementação, recursos e resultados. Comunicação
apenas aos operadores autorizados, sem distribuição pública de dados privados.

## Modelo futuro mínimo (não migrado no R0)

Entidades propostas para avaliação antes de criar migration:

- edital_opportunities: órgão, fonte, versões, anexos/retificações, prazo e status.
- edital_organization_credentials: registros protegidos, provas e validade.
- edital_applications: entidade, edital, projeto, status, revisões, responsável.
- edital_application_answers: campo do portal, resposta, origem e versão.
- edital_application_attachments: tipos, hashes, storage privado e validade.
- edital_reviews: revisores, decisões, escopo e hashes aprovados.
- edital_submission_attempts: tentativas, erros sanitizados e idempotência.
- edital_official_receipts: protocolo verificado, evidência e timestamp.
- edital_audit_events: ator, ação, autoridade, data e contexto mínimo.

Sem tabelas ou chaves novas até confirmar o boundary institucional, a topologia
atual de migrações, política de retenção e os gates existentes.

## Critérios de aceitação do piloto real

1. Fonte oficial e retificações conferidas; cláusulas rastreáveis.
2. Elegibilidade demonstrada com documento válido, ou bloqueio explícito.
3. Proposta com cada afirmação sustentada; rubricas e cálculos consistentes.
4. Formulário do portal preparado corretamente, incluindo anexos sem exposição pública.
5. Representante autorizado dá aprovação vinculada à versão imutável.
6. Envio permitido executado sem burlar verificações; nenhum duplo envio.
7. Inscrição só muda para protocolada mediante comprovante verificável.
8. Resultado e prestação de contas acompanháveis pelo responsável.
9. Testes técnicos descartáveis precedem uso com dados reais ou Production.
10. A pessoa pode parar, revisar, corrigir ou assumir manualmente em qualquer estágio.

## Provas do R0

Executar no branch isolado:

    npx vitest run lib/comun-editais-r0.test.ts
    npm run typecheck
    npm run lint
    npm run build

Verificar também acesso anônimo, acesso sem papel, flag desligada, teclado,
Android em viewport estreita, clipboard negado e ausência de qualquer POST.
Nenhum teste local ou CI equivale a prova de fluxo real em portal externo.

## Primeiro experimento operacional

Selecionar um edital **real e aberto**, cujo público-alvo inclua organizações
como a APS, e verificar elegibilidade em seu texto integral e anexos.
O primeiro protótipo receberá apenas a parte pública do edital e produzirá
pendências: ainda não haverá candidatura, coleta de identidade ou envio.
Somente depois de fechar essas pendências iniciar conector e dados privados.
