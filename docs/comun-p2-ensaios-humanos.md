# COMUN — SOC-D10.L/P2 | protocolo de ensaio humano e laboratório autenticado

**Escopo:** somente o COMUN (`comunsocial.online`); este documento não autoriza mudanças em banco, produção, contas reais, publicação de dados nem liberação das estações P3–P5. Referência: [P2 #582](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/issues/582). **Gate P1 #579 aberto** para elegibilidade, créditos, retirada e publicação real.

## Separação obrigatória das provas

| Tipo de evidência | O que demonstra | O que não demonstra |
| --- | --- | --- |
| Unitária/estática | Separação de fontes, rotas internas, estados e contratos | Autorização end-to-end ou usabilidade |
| Playwright autenticado no Supabase **local descartável** | Login real de contas sintéticas; dados sem mocks; vínculo da tarefa, retorno, liberação, isolamento entre dois usuários e logout em dois viewports | Produção, operação humana, conteúdo editorial ou navegadores/aparelhos físicos |
| Verificação externa de Production | Resposta, disponibilidade e versão real do COMUN, se acessível | Direitos/consentimento; confiança do conteúdo; comportamento de todas as contas |
| Ensaio humano consentido | Compreensão, legibilidade, contexto, sensação de controle, revogação e acessibilidade | Certificação universal ou autorização automática para P3–P5 |

**Evidência laboratorial**: `tests/comun-community-experience/my-area-private.spec.ts`, workflow `.github/workflows/comun-p2-my-area-authenticated-local.yml`. Exige `ALLOW_LOCAL_TESTS=true`, Supabase + Postgres loopback, criação/limpeza de fixtures e nenhum `SUPABASE_ACCESS_TOKEN` remoto. Não salvar capturas de cookies, JWTs, e-mails de participantes ou conteúdo privado. Só sinalizar **PASS** depois do job `SUCCESS` no **SHA exato**; falha não pode ser reclassificada como êxito.

## Checklist do ensaio humano (ainda NÃO EXECUTADO)

**Pré-condições:** consentimento livre, aparelho pertencente à pessoa ou de laboratório, contas **sintéticas**, sem telefone/documento/localização real, sem conteúdo de terceiros ou dado sensível. Conferir ambiente e versão; se for Production, limitar ações a contas próprias consentidas e NÃO criar publicações sem revisão editorial. Um responsável observa; outro valida eventual descarte de registros e sessões.

1. **Anônimo:** entrar em `/comun/minha-participacao?secao=tarefas&experiencia=app-v2`. Esperado: nenhuma contribuição, tarefa ou compromisso de outra pessoa é visível; há caminho de login seguro e retorno.
2. **Login e retomada:** usar conta sintética previamente autorizada; confirmar que voltou à seção original com `experiencia=app-v2`. Testar 390×844 e ≥ 1366px; registrar leitura, foco, zoom de 200%, teclado e leitor de tela quando disponível.
3. **Tarefas públicas:** seguir uma pauta de laboratório com tarefa aberta; confirmar que surge apenas em **“Tarefas nas pautas que acompanho”** e que a pessoa **não** acha que assumiu compromisso. Título, status e destino devem ser coerentes; `owner_alias` jamais é prova de identidade/aceite.
4. **Compromisso real:** entrar voluntariamente em ação coletiva de laboratório e **assumir** tarefa; só então deve aparecer em **“Compromissos que assumi”**, com ação de retorno clara. Não inferir vínculo com comunidade ou organização.
5. **Revogação/saída:** liberar a tarefa pelo fluxo existente; retornar à área e confirmar ausência do compromisso, sem retirar a tarefa pública acompanhada. Se houver impedimento, mensagem clara sem falsa confirmação. Saída da ação só após liberação, conforme guarda atual.
6. **Conta B e logout:** em sessão distinta, validar que nenhuma tarefa/registro privado da conta A aparece. Encerrar a sessão A, recarregar área privada e verificar exigência de autenticação; botão Voltar do navegador não deve servir registros privados em cache.
7. **Falha e indisponibilidade:** se o leitor de atribuições estiver desabilitado, a UI deve dizer **indisponível** e não “você não tem compromissos”. Em erro de conexão, não declarar transação concluída sem confirmação.
8. **Compreensão e acessibilidade:** perguntar à pessoa, sem induzir, a diferença entre “acompanho” e “assumi”; registrar se encontrou próximo passo e retorno. Conferir contraste, foco, alvos táteis, quebra de texto, leitores de tela e zoom; nunca recolher falas identificáveis.

## Registro de evidências por ciclo

Preencher no relatório de execução ou comentário da issue **somente após executar**, com: data/hora e fuso, hash da versão, ambiente, perfis fictícios (A/B sem e-mails), navegador/dispositivo ou viewport, cada cenário **PASS/FAIL/BLOCKED**, links de run e identificadores de evidência **sanitizada**, achados reproduzíveis, ações corretivas e responsável pela revisão humana. Se algum cenário estiver bloqueado, gate **NÃO CERTIFICADO**. Não registrar segredos, tokens, trace de sessão, nomes reais, geolocalização nem prints com conteúdo privado.

**Critério mínimo de saída da P2:** descobrir a área, navegar em todas as seções, retomar uma atividade existente, distinguir tarefa pública de obrigação pessoal, concluir ou revogar um compromisso sem perda de contexto, sair e manter isolamento. Exige prova laboratorial + ensaio humano independente; CI verde não substitui nenhum desses limites. A P1 ainda requer seus próprios direitos e conteúdo real; P3–P5 seguem bloqueadas.
