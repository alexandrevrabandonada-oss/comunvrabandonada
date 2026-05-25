"use client";

import { useFormState } from "react-dom";
import { loginAdmin } from "@/app/actions";

export function AdminLoginForm({ redirectTo = "/comun/admin" }: { redirectTo?: string }) {
  const [state, action] = useFormState(loginAdmin, null);

  return (
    <form action={action} className="industrial-border mx-auto mt-10 grid max-w-md gap-4 bg-comun-paper p-5 text-comun-black">
      <h1 className="text-2xl font-black uppercase">Admin COMUN</h1>
      <p className="text-sm text-comun-asphalt/75">Area interna para curadoria. Entre com o usuario cadastrado no Supabase Auth.</p>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {state?.error ? <p className="border-2 border-comun-red p-3 text-sm font-bold text-comun-red">{state.error}</p> : null}
      <label className="grid gap-2">
        <span className="text-sm font-black uppercase">E-mail</span>
        <input name="email" type="email" required className="min-h-12 border-2 border-comun-black bg-white px-3" />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-black uppercase">Senha</span>
        <input name="password" type="password" required className="min-h-12 border-2 border-comun-black bg-white px-3" />
      </label>
      <button className="min-h-12 border-2 border-comun-black bg-comun-yellow font-black uppercase">
        Entrar
      </button>
    </form>
  );
}
