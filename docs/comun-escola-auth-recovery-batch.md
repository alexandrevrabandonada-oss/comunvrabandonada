# Escola — bateria externa delimitada

Preparação, não envio nem recibo integral. Convite recebido via Gmail já provado;
não repeti-lo. Auth vazio pinned PG17.6/GoTrue v2.196, sem dados Source, mounts ou
portas externas; laboratório e receptor SMTP próprios. Usar somente templates
capturados e valores legíveis, preservando hashes e capturas originais.

## Lote já autorizado (não executar nesta passada)

Transporte: conector Gmail já conectado, remetente
`alexandrevrabandonada@gmail.com`. Destinos exclusivos, ambos aliases da mesma
caixa do titular: `alexandrevrabandonada+comun-escola-lab-a@gmail.com` e
`alexandrevrabandonada+comun-escola-lab-b@gmail.com`. Nenhum terceiro, cc/bcc,
anexo, envio Production, custo ou reenvio automático.

| Fluxo             | Operação no Auth local             | Destino                         | Máximo |
| ----------------- | ---------------------------------- | ------------------------------- | ------ |
| Cadastro          | signup protegido, identidade A     | A                               | 1      |
| Recuperação       | recover de A                       | A                               | 1      |
| Magic link/OTP    | otp de A                           | A                               | 1      |
| Mudança de e-mail | user update autenticado A → B      | A e B, conforme política Source | 2      |
| Reautenticação    | reauthenticate da identidade final | B                               | 1      |

Máximo total: **6 mensagens**, cinco operações, cada operação uma única vez.
Uma política que gere menos mensagens não autoriza usar o saldo. Qualquer mensagem
extra, destinatário diferente ou template divergente bloqueia antes do transporte.
O titular autorizou explicitamente este lote em 12/10/2026; zero mensagens usadas.
Convites anteriores consumidos não o cobrem. Subject Source change-email:
**Confirm Email Change**, leitura humana **HUMAN_READ_SOURCE** já registrada.
Captura mascarada original preservada; não pedir nova transcrição nem presumir default.
SHA-256 do Subject: `c2736949b6fef7a5b5ae9670024e3d81800152e8f454785a83a31f74cca570d1`.

## Preparação antes de qualquer envio

1. Reutilizar Subject humano acima e o body capturado, sem modificar o envelope
   original. Suplemento/prova: `2e43798cf352a3d19077dbc9ab92589b66f456da8956cfe827a393fbe37c0f57`.
2. Reproduzir os cinco fluxos primeiro no receptor local, contar MIME reais e
   confirmar política de mudança de e-mail. Manter CAPTCHA habilitado com chaves
   **exclusivas do laboratório**: negação sem token não prova aprovação; não usar
   credencial Source/Production nem admin generate_link como substituto.
3. `scripts/learning/auth-recovery-batch.mjs` prepara links e códigos OTP com
   allowlist nominal, limite por fluxo e recusa de duplicação/assunto mascarado,
   tracking/token alterado. Cinco contratos sintéticos locais PASS, zero skipped.
   Isso não gera mensagens no Auth nem prova os cinco fluxos externos. O adaptador
   de convite não será usado silenciosamente para OTP.
4. Conferir assunto/body/hash, destinatários, tipo de fluxo, ausência de tracking
   e identidade exclusivamente sintética. Token fica cifrado; nunca Git/artifact público.
5. Criar marcador persistente exclusivo por mensagem antes de chamar o conector.
   Aceite ou resultado incerto consome a tentativa. Nenhum retry automático.

## Assertions e limpeza

Recebimento ligado ao Message-ID e INBOX; assunto/HTML fiéis, sem link reescrito,
pixel ou destinatário adicional. Confirmar somente link/código **recebido**, antes
de consumir o original. Exigir sessão do usuário sintético correto, recusa cruzada,
logout e zero sessões; mudança de e-mail segue política capturada, sem reduzi-la.
Token alterado, tracking, extra recipient, replay, máscara e resposta incerta
devem bloquear. Preservar MIME e logs privados cifrados antes da limpeza restrita
aos containers/identidades identificados pelo run. Não abrir rede do restore real.

## Limites e sequência da migration

Interação humana CAPTCHA, quando necessária, não será simulada. Prova de conector
operacional não equivale a custódia/restauração da configuração externa inteira.
Fechar essas provas antes de renovar backup. Depois: backup real protegido → restore
isolado/dez requisitos → recibo revisado <=1h → PRE <=5min → avaliação do executor
→ única migration já autorizada condicionalmente. COMMIT desconhecido: reconciliação
read-only; nenhum replay automático. Seis preflights #523 continuam obrigatórios.

Gates existentes inalterados. Não foi introduzido gate humano de lançamento como
pré-condição nova da migration. Crash da instância padrão permanece finding separado.

## Interface interativa isolada — 12/10/2026

`node scripts/learning/auth-interactive-lab.mjs` serve a interface em
`http://127.0.0.1:9996`, vinculada somente ao IPv4 loopback. Sem configuração,
abre **BLOCKED**, não carrega widget remoto e não habilita operações Auth.
Esta interface não cria stack, usuário, chave ou configuração remota.

Configuração privada, fora do Git e com ACL restrita no E:, fornecida ao processo
por variáveis locais não versionadas:

- `COMUN_LAB_AUTH_URL=http://127.0.0.1:9999` (destino único permitido);
- `COMUN_LAB_CAPTCHA_PROVIDER=turnstile`, `COMUN_LAB_CONFIG_SCOPE=LAB_ONLY`;
- `COMUN_LAB_CAPTCHA_SITEKEY` e `COMUN_LAB_CAPTCHA_SECRET`: par **já existente**,
  real e exclusivo do laboratório. Nenhum par assim foi encontrado nas variáveis
  consultadas ou no inventário de configurações laboratoriais. Não usar chaves
  dummy, credencial Production ou criar chave remota nesta autorização;
- `COMUN_LAB_WIDGET_ORIGIN`: opcional, default `http://127.0.0.1:9996`;
- `COMUN_LAB_READY_RECEIPT`: JSON privado emitido pelo coordenador da stack própria;
- `COMUN_LAB_PRIVATE_MARKER_DIR`: diretório privado por execução, fora do repositório,
  com ACL Micro já conferida. Nunca reutilizar diretório para permitir reenvio.

O recibo de preparação (não permit de migration) deve comprovar `scope=OWNED_SYNTHETIC_LAB`,
Auth/PG nos image IDs de `pinnedLab`, `authUrl`, `captchaProvider=turnstile`,
`smtp=LOCAL_ONLY`, `productionCredentials=false`, `productionData=false`,
`templateHashesVerified=true`, os cinco pares `templateHashes` de
`capturedTemplates`, `sourceSubject=Confirm Email Change`,
`sourceEmailChangePolicyVerified=true` e `sourceEmailPolicyCaptureSha256` igual a
`2e80a86d3135a0bd31ff65d49adf1aa69b0a5c58ed8bab67db16ce1472c3da66`.
Também exige `allowedWidgetHost`, `providerHostAccepted=true` e hashes das chaves
**laboratoriais** (`captchaSitekeySha256`, `captchaSecretSha256`), mantidos privados.
Não fabricar recibo preenchendo booleans: inspecionar containers próprios, templates,
política capturada e configuração existente do provedor antes da emissão.
O segredo entra apenas no ambiente não versionado do Auth sintético; nunca no cliente.
Validação de formato não comprova validade da chave: o provedor/Auth ainda devem aceitá-la.

Turnstile foi escolhido por oferecer oficialmente `response-field=false`;
o token CAPTCHA fica em memória e segue diretamente ao Auth loopback. Não há
rota do harness para receber esse token, storage de sessão, logging de payload
ou envio Gmail. CAPTCHA expirado, erro do widget/hostname ou ausência de interação
humana observada impedem o envio. Sucesso automático do widget não é MANUAL_PASS.
Desafio observado + aceite Auth ainda exigem registro privado da interação humana;
o harness nunca emite PASS positivo automaticamente.

Não presumir que um hostname/IP é aceito pelo provedor. Se o widget existente
exigir hostname nomeado, usar somente um nome **já autorizado** e já resolvido
exclusivamente para `127.0.0.1`, porta 9996. A interface aceita essa configuração
após verificar resolução loopback; não modifica DNS/hosts, não abre túnel e não
expõe Auth. Sem esse requisito, bloquear e delimitar uma intervenção para disponibilizar
a configuração laboratorial existente. Não editar Source/Production.
Referências oficiais: [Turnstile response field, callbacks e expiração](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/),
[hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/),
[limitação localhost do hCaptcha](https://docs.hcaptcha.com/#local-development).

Cada operação reserva marcador persistente exclusivo **antes** do fetch ao Auth.
Aceite/resultado incerto impede repetição. Máximos do runbook permanecem 1/1/1/2/1;
o coordenador SMTP deve recusar recipient extra, divergência de MIME e excesso.
A interface limita as cinco operações, mas não substitui a contagem/validação de
MIME do receptor SMTP. Sessão fica em memória; confirmação de código recebido
exige identidade nominal; confirmação por link, duas confirmações da mudança de
e-mail conforme Source, isolamento cruzado e limpeza continuam sob o coordenador
privado. Esses contratos reais **não foram executados** sem CAPTCHA válido.

Estados desta passada: controles negativos anteriores **PASS reutilizado**, sem
repetição, no escopo original hCaptcha (não certificam uma stack Turnstile);
testes focais/interface bloqueada **PASS**; CAPTCHA humano positivo,
cinco fluxos SMTP/sessões/isolamento/limpeza **NOT_RUN**. Bloqueio acionável:
**LAB_REAL_KEYS_REQUIRED** (par exclusivo existente não localizado); recibo da
stack/host ainda não emitido. Nenhum novo gate foi acrescentado ao executor da migration.
Gmail **0/6**, backup não renovado, permit não emitido, migration não executada.
