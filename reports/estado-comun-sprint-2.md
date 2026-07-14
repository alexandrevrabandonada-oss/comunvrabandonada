# Estado COMUN Sprint 2

Data: 2026-05-27

## Objetivo do tijolo

Fechar o fluxo publico inicial de relato em `/comun/relatar`, sem login obrigatorio, com captura dos dados essenciais, opcoes claras de seguranca, revisao antes do envio e tela de confirmacao com protocolo.

## O que foi implementado

### Formulario publico em etapas

Atualizado em [app/comun/relatar/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/page.tsx>):

- etapa `Tema`
- etapa `O que aconteceu?`
- etapa `Provas e anexos`
- etapa `Seguranca`
- etapa `Revisao`

### Captura de dados essenciais

Campos cobertos:

- tema do relato
- pauta relacionada, se fizer sentido
- titulo curto opcional
- relato principal
- periodo aproximado
- bairro
- local aproximado
- empresa, orgao ou servico envolvido
- envio anonimo
- autorizacao para publicacao sanitizada
- permissao de contato
- contato privado opcional separado

### Revisao antes do envio

Antes de enviar, a tela mostra um resumo do que foi preenchido e reforca que:

- nada e publicado automaticamente
- o relato bruto continua interno
- dados sensiveis nao devem aparecer no texto

### Confirmacao com protocolo

Atualizada em [app/comun/relatar/confirmacao/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/confirmacao/page.tsx>):

- mensagem `Seu relato foi recebido.`
- exibicao do protocolo
- bloco para orientar a guardar o protocolo
- acoes:
  - `Acompanhar este relato`
  - `Ver relatos parecidos`
  - `Enviar outro relato`

## Comportamento mantido

- sem login obrigatorio
- sem publicacao automatica
- contato privado continua fora de paginas publicas
- backend existente continua recebendo os relatos por `submitReport`

## Validacao minima

Ja existente no backend e mantida:

- `community_slug` obrigatorio
- `raw_text` com minimo de 20 caracteres

Adicionado no cliente:

- `relato principal` com `minLength=20`
- revisao visual antes do envio
- campo de contato desabilitado quando a pessoa nao autoriza contato

## Limitacoes atuais

1. Upload de anexos ainda e placeholder.
2. `Acompanhar este relato` ainda nao abre uma trilha dedicada por protocolo; neste MVP a navegacao segue para a area publica de comunidades.
3. `Ver relatos parecidos` ainda aponta para navegacao geral do modulo, nao para uma recomendacao automatica.
4. A opcao `Outro tema` ainda precisa ser normalizada para uma categoria existente no envio. Hoje ela entra pela classificacao server-side provisoria associada ao eixo de cidade/servicos, e a curadoria faz o enquadramento final.
5. Persistencia real de anexos, acompanhamento por protocolo e classificacao mais fina ainda dependem de tijolos futuros.

## Arquivos alterados ou criados

Alterados:

- [app/comun/relatar/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/page.tsx>)
- [app/comun/relatar/confirmacao/page.tsx](</C:/Projetos/COMUM VR ABANDONADA/app/comun/relatar/confirmacao/page.tsx>)

Criado:

- [reports/estado-comun-sprint-2.md](</C:/Projetos/COMUM VR ABANDONADA/reports/estado-comun-sprint-2.md>)

## Resultado da verificacao

Comando executado:

```bash
npm run verify
```

Resultado:

- `lint`: passou
- `typecheck`: passou
- `build`: passou

## Riscos

- o fluxo de revisao e cliente-side; ainda nao existe bloqueio mais sofisticado de navegacao por etapa
- `Outro tema` ainda depende de classificacao posterior, nao de modelagem dedicada
- confirmacao com protocolo existe, mas o acompanhamento publico por protocolo ainda nao existe
- anexos ainda nao entram em persistencia real

## Proximo passo recomendado para persistencia real

1. Criar suporte explicito a classificacao `outro tema` sem reuso provisoria de categoria.
2. Implementar acompanhamento de relato por protocolo, sem expor dados privados.
3. Evoluir anexos com upload seguro server-side.
4. Adicionar smoke ou teste de fluxo para submissao completa do formulario publico.
