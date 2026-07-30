import { readFile, writeFile } from "node:fs/promises";

const replacements = [
  {
    path: "components/sidewalk-first-participation-form.tsx",
    pairs: [
      [
        'publication_consent: "autorização para publicação sanitizada",',
        'publication_consent: "autorização para publicação do ponto exato",',
      ],
      [
        `      <input
        type="hidden"
        name="consent_publish"
        value={consentPublish ? "yes" : "no"}
      />`,
        `      <input
        type="hidden"
        name="consent_publish"
        value={consentPublish ? "yes" : "no"}
      />
      <input
        type="hidden"
        name="consent_location_precision"
        value={consentPublish ? "exact" : "none"}
      />`,
      ],
      [
        `              A fotografia e o ponto exato ficam privados. Se a equipe aprovar a
              contribuição, somente uma derivada revisada e uma localização
              aproximada poderão aparecer no mapa.`,
        `              A fotografia original e a identidade permanecem privadas. Se a
              equipe aprovar a contribuição, uma derivada revisada e o ponto
              exato marcado poderão aparecer no mapa público.`,
      ],
      [
        `                Autorizo a publicação sanitizada da contribuição após moderação.`,
        `                Autorizo a publicação do ponto exato marcado e de uma versão
                sanitizada da contribuição após moderação.`,
      ],
    ],
  },
  {
    path: "lib/sidewalk-submission-readiness.ts",
    pairs: [
      [
        `    consent_publish: String(data.get("consent_publish") ?? ""),`,
        `    consent_publish: String(data.get("consent_publish") ?? ""),
    consent_location_precision: String(
      data.get("consent_location_precision") ?? "",
    ),`,
      ],
    ],
  },
  {
    path: "lib/sidewalk-submission-readiness.test.ts",
    pairs: [
      [
        `      ["consent_publish", "yes"],`,
        `      ["consent_publish", "yes"],
      ["consent_location_precision", "exact"],`,
      ],
      [
        `      consent_publish: "yes",`,
        `      consent_publish: "yes",
      consent_location_precision: "exact",`,
      ],
    ],
  },
  {
    path: "app/comun/admin/calcadas/page.tsx",
    pairs: [
      [
        `import { decideSidewalkDuplicate, moderateSidewalkObservation, moderateSidewalkRecord } from "./actions";`,
        `import { decideSidewalkDuplicate, moderateSidewalkObservation, moderateSidewalkRecord } from "./actions";
import { moderateSidewalkRecordExact } from "./exact-actions";`,
      ],
      [
        `              <p className="text-sm">Remova contatos, endereço completo, telefone, e-mail, nomes de terceiros e qualquer informação sensível antes de publicar.</p>`,
        `              <p className="text-sm">Remova contatos, endereço completo, telefone, e-mail, nomes de terceiros e qualquer informação sensível antes de publicar.</p>
              <p className="text-sm font-bold">A publicação do ponto exato só é concluída quando o envio contém consentimento explícito vinculado ao registro.</p>`,
      ],
      [
        `              </div>
            </form>`,
        `              </div>
              <button
                formAction={moderateSidewalkRecordExact}
                className="btn"
              >
                Aprovar com ponto exato consentido
              </button>
            </form>`,
      ],
    ],
  },
];

function replaceOnce(source, before, after, path) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    throw new Error(`Âncora ausente em ${path}: ${before.slice(0, 80)}`);
  }
  return source.replace(before, after);
}

for (const entry of replacements) {
  let source = await readFile(entry.path, "utf8");
  for (const [before, after] of entry.pairs) {
    source = replaceOnce(source, before, after, entry.path);
  }
  await writeFile(entry.path, source);
}

console.log("COMUN_SIDEWALK_EXACT_CONSENT_CODEMOD_APPLIED");
