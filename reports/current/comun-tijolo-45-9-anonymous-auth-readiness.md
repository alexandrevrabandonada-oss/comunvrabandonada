# Tijolo 45.9 — Auth anônimo seguro e primeira contribuição

Resultado terminal:
`COMUN_SIDEWALK_ANONYMOUS_AUTH_BLOCKED_MISSING_CAPTCHA_CONFIGURATION`

## Escopo e decisão

- ciclo: `sidewalk-anonymous-auth-first-contribution-20260729-09`;
- main inicial: `8be1155dc431cffa151522d8c95c6182355a5345`;
- ciclo anterior preservado: run `30466525556`, `submissionAttempt=0`;
- provedor anônimo antes/depois: `disabled` / `disabled`;
- CAPTCHA: provider, secret e site key ausentes;
- rate limit anônimo efetivo: não observado;
- criação de usuário anônimo: zero;
- submissão: não executada;
- escritas em banco e Storage: nenhuma.

O fluxo não pode habilitar Auth anônimo antes de comprovar a proteção contra
abuso. A configuração local contém apenas o exemplo comentado de CAPTCHA. Os
nomes de secrets disponíveis ao job não incluem credenciais de CAPTCHA nem um
site key público, e o ambiente local também não os fornece. Nenhum valor de
secret foi lido ou persistido.

Como a condição obrigatória falhou, este ciclo encerrou antes de qualquer
alteração no Supabase Auth. Não houve tentativa de contornar a exigência,
criação de credencial fictícia ou habilitação parcial.

## Auditoria de segurança

No escopo das Calçadas, o desenho existente permanece coerente:

- usuários anônimos do Supabase entram pelo papel `authenticated`;
- uploads privados exigem ownership por `auth.uid()` e são mediados pelo
  servidor;
- registros operacionais permanecem restritos ao servidor e passam por
  moderação;
- o bucket de originais é privado e o fluxo usa URL assinada para o objeto
  específico;
- a sessão anônima é criada somente após o clique deliberado, não na abertura
  da página nem na seleção da imagem;
- service role não é exposta no cliente.

Não foi necessária migration de segurança. A auditoria global local de RLS
teve uma limitação fora do escopo das Calçadas: duas classificações de Ações
Coletivas não tinham tabelas correspondentes na fixture local. Essa saída
gerada não foi versionada e não altera a conclusão específica deste gate.

## Evidências e testes

- contrato explícito de privilégios: verde;
- hardening de segurança: 2/2;
- promotion runner e transporte PostgreSQL: 31/31;
- ledger e hashes canônicos: preservados;
- artifact JSON: sanitizado, sem credenciais ou valores de conexão.

## Estado operacional preservado

- deployment observado: `READY`;
- banco: alcançável;
- ledger: exato;
- migration necessária: não;
- flag operacional: `enabled`;
- runtime: `OPERATIONAL_READY`;
- estado público: `active`;
- activation attempt 03: não reutilizado;
- migration, activation, rollback e retry: não executados.

## Próximo gate

Uma pessoa responsável precisa fornecer/configurar externamente, em um único
pacote auditável:

1. provedor CAPTCHA escolhido e habilitado no Supabase Auth;
2. secret do provedor no backend, sem exposição;
3. site key pública no frontend;
4. configuração observável do rate limit de sign-in anônimo;
5. evidência read-only de que os quatro itens pertencem ao projeto canônico.

Somente um ciclo futuro, com essas evidências presentes, poderá revalidar e
habilitar o provedor anônimo antes de preparar uma nova contribuição única. O
cycle ID atual não pode ser reutilizado.
