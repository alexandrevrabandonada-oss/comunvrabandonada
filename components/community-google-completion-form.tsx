import Link from "next/link";
import { completeGoogleCommunityProfile } from "@/app/actions";

export function CommunityGoogleCompletionForm({
  displayName,
  returnTo,
}: {
  displayName: string;
  returnTo: string;
}) {
  return (
    <form action={completeGoogleCommunityProfile} className="grid gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="grid gap-1 font-bold">
        Nome de exibição
        <input
          name="display_name"
          defaultValue={displayName}
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          className="min-h-12 border-2 border-comun-black bg-white p-3"
        />
        <span className="text-sm font-normal text-comun-asphalt/75">
          É uma sugestão editável. O nome do Google não será publicado automaticamente.
        </span>
      </label>
      <label className="flex items-start gap-3 font-bold">
        <input name="terms" type="checkbox" required className="mt-1 size-5" />
        <span>Aceito os termos de participação.</span>
      </label>
      <label className="flex items-start gap-3 font-bold">
        <input name="privacy" type="checkbox" required className="mt-1 size-5" />
        <span>
          Li a <Link className="underline" href="/comun/conta/privacidade">política de privacidade</Link>.
        </span>
      </label>
      <button type="submit" className="min-h-12 bg-comun-yellow px-4 font-black uppercase">
        Concluir acesso
      </button>
    </form>
  );
}
