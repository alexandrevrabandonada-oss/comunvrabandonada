"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { createCommunityAccount, loginCommunity } from "@/app/actions";
import { withComunAppV2 } from "@/lib/comun-shell-contract";
export function CommunityLoginForm({
  returnTo,
  experienceV2 = false,
}: {
  returnTo?: string;
  experienceV2?: boolean;
}) {
  const [state, action] = useActionState(loginCommunity, null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state?.error) errorRef.current?.focus();
  }, [state?.error]);
  return (
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
  );
}
export function CommunitySignupForm({ returnTo }: { returnTo?: string }) {
  const [state, action] = useActionState(createCommunityAccount, null);
  return (
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
      {state?.error && <p role="alert">{state.error}</p>}
      <button className="min-h-11 bg-comun-yellow font-black uppercase">
        Criar conta
      </button>
    </form>
  );
}
