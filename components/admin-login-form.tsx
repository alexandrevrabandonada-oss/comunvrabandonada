"use client";

import { useActionState } from "react";
import { loginAdmin, signInAdminWithGoogle } from "@/app/actions";
import { useFormStatus } from "react-dom";

export function AdminLoginForm({
  redirectTo = "/comun/admin",
  googleAuthEnabled = false,
}: {
  redirectTo?: string;
  googleAuthEnabled?: boolean;
}) {
  const [state, action] = useActionState(loginAdmin, null);

  return (
    <div className="industrial-border mx-auto mt-10 grid max-w-md gap-4 bg-comun-paper p-5 text-comun-black">
      <h1 className="text-2xl font-black uppercase">Admin COMUN</h1>
      <p className="text-sm text-comun-asphalt/75">
        Área interna para curadoria. A conta precisa estar autenticada e ter uma
        autorização administrativa ativa.
      </p>
      {googleAuthEnabled ? (
        <form action={signInAdminWithGoogle}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <AdminGoogleSubmitButton />
        </form>
      ) : null}
      {googleAuthEnabled ? (
        <p className="text-center text-xs font-black uppercase text-comun-concrete">
          ou entre com e-mail e senha
        </p>
      ) : null}
      <form action={action} className="grid gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {state?.error ? (
          <p
            role="alert"
            className="border-2 border-comun-red p-3 text-sm font-bold text-comun-red"
          >
            {state.error}
          </p>
        ) : null}
        <label className="grid gap-2">
          <span className="text-sm font-black uppercase">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            className="min-h-12 border-2 border-comun-black bg-white px-3"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-black uppercase">Senha</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-12 border-2 border-comun-black bg-white px-3"
          />
        </label>
        <button className="min-h-12 border-2 border-comun-black bg-comun-yellow font-black uppercase">
          Entrar
        </button>
      </form>
    </div>
  );
}

function AdminGoogleSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex min-h-12 w-full items-center justify-center gap-3 border-2 border-comun-black bg-white px-4 font-black disabled:cursor-wait disabled:opacity-60"
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
