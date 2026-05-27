import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function argValues(flag) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
    }
  }
  return values;
}

function logOk(message) {
  console.log(`[ok] ${message}`);
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exitCode = 1;
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

loadEnvFile(envPath);

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (!baseUrl) {
  fail("NEXT_PUBLIC_SITE_URL ausente.");
  process.exit();
}

const requiredTexts = argValues("--required");
const forbiddenTexts = argValues("--forbidden");
const paths = argValues("--path");
const resolvedPaths = paths.length ? paths : ["/comun/pautas/trabalho-burnout-volta-redonda"];
const resolvedRequiredTexts = requiredTexts.length
  ? requiredTexts
  : ["Relato aponta pressao no ambiente de trabalho e possivel atraso de direitos."];
const resolvedForbiddenTexts = forbiddenTexts.length
  ? forbiddenTexts
  : ["raw_text", "private_contact", "internal_notes"];

for (const currentPath of resolvedPaths) {
  const response = await fetch(new URL(currentPath, baseUrl));
  if (!response.ok) {
    fail(`${currentPath} retornou status ${response.status}`);
    continue;
  }

  const html = await response.text();
  const normalizedHtml = normalizeText(html);

  for (const requiredText of resolvedRequiredTexts) {
    if (!normalizedHtml.includes(normalizeText(requiredText))) {
      fail(`${currentPath} nao contem o texto esperado: ${requiredText}`);
    }
  }

  for (const forbiddenText of resolvedForbiddenTexts) {
    if (normalizedHtml.includes(normalizeText(forbiddenText))) {
      fail(`${currentPath} vazou texto proibido: ${forbiddenText}`);
    }
  }

  logOk(`${currentPath} passou nas verificacoes de conteudo`);
}
