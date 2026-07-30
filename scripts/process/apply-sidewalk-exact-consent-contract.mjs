import { readFile, writeFile } from "node:fs/promises";

const replacements = [
  {
    path: "components/sidewalk-first-participation-form.tsx",
    changes: [
      {
        before:
          'publication_consent: "autorização para publicação sanitizada",',
        after:
          'publication_consent: "autorização para publicação do ponto exato",',
        marker: "autorização para publicação do ponto exato",
      },
      {
        before: `      <input
        type="hidden"
        name="consent_publish"
        value={consentPublish ? "yes" : "no"}
      />`,
        after: `      <input
        type="hidden"
        name="consent_publish"
        value={consentPublish ? "yes" : "no"}
      />
      <input
        type="hidden"
        name="consent_location_precision"
        value={consentPublish ? "exact" : "none"}
      />`,
        marker: 'name="consent_location_precision"',
      },
      {
        before: `              A fotografia e o ponto exato ficam privados. Se a equipe aprovar a
              contribuição, somente uma derivada revisada e uma localização
              aproximada poderão aparecer no mapa.`,
        after: `              A fotografia original e a identidade permanecem privadas. Se a
              equipe aprovar a contribuição, uma derivada revisada e o ponto
              exato marcado poderão aparecer no mapa público.`,
        marker: "exato marcado poderão aparecer no mapa público",
      },
      {
        before: `                Autorizo a publicação sanitizada da contribuição após moderação.`,
        after: `                Autorizo a publicação do ponto exato marcado e de uma versão
                sanitizada da contribuição após moderação.`,
        marker: "Autorizo a publicação do ponto exato marcado",
      },
    ],
  },
  {
    path: "lib/sidewalk-submission-readiness.ts",
    changes: [
      {
        before: `    consent_publish: String(data.get("consent_publish") ?? ""),`,
        after: `    consent_publish: String(data.get("consent_publish") ?? ""),
    consent_location_precision: String(
      data.get("consent_location_precision") ?? "",
    ),`,
        marker: 'data.get("consent_location_precision")',
      },
    ],
  },
  {
    path: "lib/sidewalk-submission-readiness.test.ts",
    changes: [
      {
        before: `      ["consent_publish", "yes"],`,
        after: `      ["consent_publish", "yes"],
      ["consent_location_precision", "exact"],`,
        marker: '["consent_location_precision", "exact"]',
      },
      {
        before: `      consent_publish: "yes",`,
        after: `      consent_publish: "yes",
      consent_location_precision: "exact",`,
        marker: 'consent_location_precision: "exact"',
      },
    ],
  },
  {
    path: "app/comun/admin/calcadas/page.tsx",
    changes: [
      {
        before: `import { decideSidewalkDuplicate, moderateSidewalkObservation, moderateSidewalkRecord } from "./actions";`,
        after: `import { decideSidewalkDuplicate, moderateSidewalkObservation, moderateSidewalkRecord } from "./actions";
import { moderateSidewalkRecordExact } from "./exact-actions";`,
        marker: 'from "./exact-actions"',
      },
      {
        before: `              <p className="text-sm">Remova contatos, endereço completo, telefone, e-mail, nomes de terceiros e qualquer informação sensível antes de publicar.</p>`,
        after: `              <p className="text-sm">Remova contatos, endereço completo, telefone, e-mail, nomes de terceiros e qualquer informação sensível antes de publicar.</p>
              <p className="text-sm font-bold">A publicação do ponto exato só é concluída quando o envio contém consentimento explícito vinculado ao registro.</p>`,
        marker: "consentimento explícito vinculado ao registro",
      },
      {
        before: `              </div>
            </form>`,
        after: `              </div>
              <button
                formAction={moderateSidewalkRecordExact}
                className="btn"
              >
                Aprovar com ponto exato consentido
              </button>
            </form>`,
        marker: "Aprovar com ponto exato consentido",
      },
    ],
  },
];

function replaceOnce(source, change, path) {
  if (source.includes(change.marker)) return source;
  if (!source.includes(change.before)) {
    throw new Error(
      `Âncora ausente em ${path}: ${change.before.slice(0, 80)}`,
    );
  }
  return source.replace(change.before, change.after);
}

for (const entry of replacements) {
  let source = await readFile(entry.path, "utf8");
  for (const change of entry.changes) {
    source = replaceOnce(source, change, entry.path);
  }
  await writeFile(entry.path, source);
}

console.log("COMUN_SIDEWALK_EXACT_CONSENT_CODEMOD_APPLIED");
