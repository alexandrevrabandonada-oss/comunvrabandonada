import { ComunShell, Section } from "@/components/comun-shell";
import { PhotoSubmissionForm } from "./photo-submission-form";
export const metadata = { title: "Contribuir com fotografia | Acervo Vivo" };
export default function ContributePhotoPage() {
  return (
    <ComunShell>
      <Section>
        <p className="font-black uppercase text-comun-yellow">Acervo Vivo</p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-paper">
          Compartilhe uma fotografia historica
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Ajude a preservar a memoria de sua cidade. O original fica privado, e
          somente uma versao revisada pode ser publicada.
        </p>
        <div className="mt-8">
          <PhotoSubmissionForm />
        </div>
      </Section>
    </ComunShell>
  );
}
