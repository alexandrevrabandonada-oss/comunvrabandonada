import { assertLocalEnvironment } from "./local-environment.mjs";
import { cleanupLocalComunFixtures, createLocalPautaMiniappFixture } from "../tests/fixtures/comun/local-fixtures.mjs";

const base = assertLocalEnvironment();
let fixture;
try {
  await cleanupLocalComunFixtures(); fixture = await createLocalPautaMiniappFixture();
  const response = await fetch(`${base}/comun/pautas/${fixture.slug}`); const html = await response.text();
  if (!response.ok) throw new Error(`Pauta fixture retornou ${response.status}`);
  for (const text of ["Pauta pública de fixture", "Visão geral de teste", "Roda pública de teste", "Roda de escuta fixture", "Síntese publicada da fixture", "Divergência preservada"]) if (!html.includes(text)) throw new Error(`Contrato público ausente: ${text}`);
  for (const privateText of ["private_contact", "moderation_note_private", "service_role", "admin-local@comun.test"]) if (html.includes(privateText)) throw new Error(`Vazamento privado: ${privateText}`);
  const shell = await fetch(`${base}/comun`); if (!shell.ok || !(await shell.text()).includes("COMUN VR ABANDONADA")) throw new Error("Shell público indisponível.");
  console.log(`smoke:public-ui:local ok url=${base}/comun/pautas/${fixture.slug}`);
} finally { await cleanupLocalComunFixtures(); }
