"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createCommunityAccount,
  loginCommunity,
  signInCommunityWithGoogle,
} from "@/app/actions";
import { withComunAppV2 } from "@/lib/comun-shell-contract";
export function CommunityLoginForm({
  returnTo,
  experienceV2 = false,
  googleAuthEnabled = false,
}: {
  returnTo?: string;
  experienceV2?: boolean;
  googleAuthEnabled?: boolean;
}) {
  const [state, action] = useActionState(loginCommunity, null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state?.error) errorRef.current?.focus();
  }, [state?.error]);
  return (
    <div className="grid gap-4">
      {googleAuthEnabled ? (
        <CommunityGoogleButton
          returnTo={returnTo}
          experienceV2={experienceV2}
        />
      ) : null}
      {googleAuthEnabled ? (
        <div
          className="flex items-center gap-3 text-xs font-black uppercase text-comun-black"
          role="separator"
          aria-label="ou entre com e-mail"
        >
          <span className="h-px flex-1 bg-current/30" aria-hidden="true" />
          <span>ou entre com e-mail</span>
          <span className="h-px flex-1 bg-current/30" aria-hidden="true" />
        </div>
      ) : null}
      <form action={action} className="grid gap-3" aria-label="Entrar no COMUN">
        <input type="hidden" name="returnTo" value={returnTo} />
        <label>
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={
              experienceV2
                ? "mt-1 min-h-12 w-full rounded-[var(--comun-radius-control)] border-2 border-comun-black bg-white p-3 text-comun-black"
                : "mt-1 w-full border-2 border-comun-black p-2"
            }
          />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={
              experienceV2
                ? "mt-1 min-h-12 w-full rounded-[var(--comun-radius-control)] border-2 border-comun-black bg-white p-3 text-comun-black"
                : "mt-1 w-full border-2 border-comun-black p-2"
            }
          />
        </label>
        {state?.error && (
          <p
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="font-bold text-red-800"
          >
            {state.error}
          </p>
        )}
        <button
          className={
            experienceV2
              ? "min-h-12 rounded-[var(--comun-radius-control)] bg-comun-yellow px-4 font-black uppercase text-comun-black"
              : "min-h-11 bg-comun-yellow font-black uppercase"
          }
        >
          Entrar
        </button>
        <Link
          className={
            experienceV2
              ? "comun-text-action inline-flex min-h-11 items-center font-bold underline"
              : "font-bold underline"
          }
          href={withComunAppV2("/comun/recuperar-acesso", experienceV2)}
        >
          Esqueci minha senha
        </Link>
      </form>
    </div>
  );
}
export function CommunitySignupForm({
  returnTo,
  googleAuthEnabled = false,
}: {
  returnTo?: string;
  googleAuthEnabled?: boolean;
}) {
  const [state, action] = useActionState(createCommunityAccount, null);
  return (
    <div className="grid gap-4">
      {googleAuthEnabled ? <CommunityGoogleButton returnTo={returnTo} /> : null}
      {googleAuthEnabled ? (
        <p
          className="text-center text-xs font-black uppercase text-comun-concrete"
          role="separator"
        >
          ou crie com e-mail e senha
        </p>
      ) : null}
      <form action={action} className="grid gap-3">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
        />
        <label>
          Nome de exibição
          <input
            name="display_name"
            autoComplete="name"
            required
            className="mt-1 w-full border-2 border-comun-black p-2"
          />
        </label>
        <label>
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full border-2 border-comun-black p-2"
          />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            minLength={10}
            autoComplete="new-password"
            required
            className="mt-1 w-full border-2 border-comun-black p-2"
          />
        </label>
        <label>
          Confirmar senha
          <input
            name="password_confirmation"
            type="password"
            minLength={10}
            autoComplete="new-password"
            required
            className="mt-1 w-full border-2 border-comun-black p-2"
          />
        </label>
        <label>
          <input name="terms" type="checkbox" required /> Aceito os termos de
          participação.
        </label>
        <label>
          <input name="privacy" type="checkbox" required /> Li a política de
          privacidade.
        </label>
        {state?.error ? <p role="alert">{state.error}</p> : null}
        {state?.status === "confirmation_required" ? (
          <p role="status" tabIndex={-1}>
            {state.message ??
              "Conta criada. Confira seu e-mail para confirmar o acesso e continuar."}
          </p>
        ) : null}
        <button className="min-h-11 bg-comun-yellow font-black uppercase">
          Criar conta
        </button>
      </form>
    </div>
  );
}

export function CommunityGoogleButton({
  returnTo,
  experienceV2 = false,
}: {
  returnTo?: string;
  experienceV2?: boolean;
}) {
  return (
    <form action={signInCommunityWithGoogle}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <GoogleSubmitButton experienceV2={experienceV2} />
    </form>
  );
}

function GoogleSubmitButton({ experienceV2 }: { experienceV2?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        experienceV2
          ? "flex min-h-12 w-full items-center justify-center gap-3 rounded-[var(--comun-radius-control)] border-2 border-comun-black bg-white px-4 font-black text-comun-black disabled:cursor-wait disabled:opacity-60"
          : "flex min-h-12 w-full items-center justify-center gap-3 border-2 border-comun-black bg-comun-paper px-4 font-black text-comun-black disabled:cursor-wait disabled:opacity-60"
      }
    >
      <span
        aria-hidden="true"
        className="grid size-6 place-items-center rounded-full border border-comun-black text-sm font-black"
      >
        G
      </span>
      {pending ? "Abrindo acesso…" : "Continuar com Google"}
    </button>
  );
}
