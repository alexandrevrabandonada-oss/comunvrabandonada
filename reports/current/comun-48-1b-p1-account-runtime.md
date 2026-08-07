# COMUN 48.1B-P1 — runtime de Conta

- cadastro agora exige `COMMUNITY_REGISTRATION_MODE=open` explicitamente;
- ausência da variável mantém o cadastro fechado;
- quando o provedor exige confirmação de e-mail, o cadastro informa `confirmation_required` em vez de redirecionar falsamente;
- sessão é atualizada no middleware para entrada, cadastro, onboarding, Minha Participação, Conta e recuperação;
- logout/login preserva o perfil e o retorno seguro;
- Google permanece desligado e sem escopos adicionais.

Estado técnico local: `GREEN`.
