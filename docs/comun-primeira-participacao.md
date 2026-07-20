# Contrato da primeira participação

## Jornada

| Etapa | Compreender | Ação principal | Dados novos | Permissão | Confirmação/recuperação | Próxima ação |
| --- | --- | --- | --- | --- | --- | --- |
| exploração | valor público antes da conta | registrar problema | nenhum | nenhuma | voltar preserva pauta | cadastro |
| cadastro | conta protege acompanhamento | criar conta | nome, e-mail, senha, aceite | sessão | erro específico e formulário preservado | onboarding |
| onboarding mínimo | território organiza sem expor precisão | salvar território amplo | cidade; bairro opcional | nenhuma | pode editar depois | retornar ao registro |
| foto | imagem é privada até revisão | escolher JPEG ou seguir sem | arquivo temporário | seletor iniciado pela pessoa | remover/tentar novamente | local |
| local | localização aproximada é necessária | marcar ponto manual | referência aproximada | nenhuma; GPS não solicitado | alternativa textual | problema |
| problema | classificação orienta revisão | descrever | categoria, impacto, descrição | nenhuma | voltar e corrigir | revisar |
| revisão | nada será publicado automaticamente | enviar | nenhum adicional | upload local | erro recuperável mantém escolhas não sensíveis | confirmação |
| confirmação | estado é “em revisão” e por quê | abrir Minha área | nenhum | sessão | links para área e pauta | acompanhar |
| Minha área | contribuição está no processo coletivo | voltar à pauta | nenhum | sessão | próxima ação explícita | resultado/memória |

Máximo desejado: quatro etapas de contribuição, um passo obrigatório de onboarding contextual, quatro campos de cadastro mais dois consentimentos, três decisões do registro além da escolha opcional de foto. Nenhuma imagem, descrição, coordenada, contato, token ou ID interno é guardado em `localStorage`.

## Segurança do retorno

Somente caminhos internos em `/comun` são aceitos. URLs externas, protocolos, rotas administrativas, barras invertidas e loops de login/cadastro/onboarding caem em destino seguro. A etapa retomável é apenas um número acompanhado de categoria e preferência de mapa manual.
