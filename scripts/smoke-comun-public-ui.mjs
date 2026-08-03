import fs from "node:fs";
import { assertProductionChecksAllowed } from "./production-guard.mjs";
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

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`[ok] ${message}`);
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

loadEnvFile(envPath);
const baseUrl = process.env.COMUN_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
assertProductionChecksAllowed(baseUrl);
if (!baseUrl) {
  fail("COMUN_BASE_URL ou NEXT_PUBLIC_SITE_URL ausente.");
  process.exit();
}

const checks = [
  {
    path: "/comun",
    required: [
      "O que precisa de atenção?",
      "Escolha como começar",
      "Atalhos",
      "Acompanhamentos",
      "Mapa das Calçadas",
    ],
  },
  {
    path: "/comun/comunidades",
    required: ["Comunidades", "Conhecer comunidade"],
  },
  {
    path: "/comun/c/trabalho",
    required: ["Acompanhar ou solicitar entrada", "Próxima atividade"],
  },
  {
    path: "/comun/pautas/falta-profissionais-escolas",
    required: ["Enviar relato parecido", "Acompanhar pauta"],
  },
  {
    path: "/comun/pautas/trabalho-burnout-volta-redonda",
    required: ["Relatar situacao de trabalho", "Acompanhar pauta"],
  },
  {
    path: "/comun/dossies",
    required: ["Dossies publicados", "Filtrar dossies"],
  },
  {
    path: "/comun/dossies/burnout-e-pressao-no-trabalho",
    required: ["Enviar relato relacionado"],
  },
  {
    path: "/comun/seguranca",
    required: [
      "Como o COMUN protege relatos",
      "Fotos enviadas no relato rapido",
      "Enviar relato com seguranca",
    ],
  },
  {
    path: "/comun/relatar",
    required: [
      "Relato rapido",
      "Relato detalhado",
      "Foto opcional",
      "Usar minha localizacao aproximada",
    ],
    allowFormFieldNames: true,
  },
  {
    path: "/comun/acompanhar",
    required: ["Acompanhar relato", "Consultar"],
  },
  {
    path: "/comun/relatar/confirmacao?protocolo=COMUN-TESTE",
    required: ["Acompanhar participação", "Copiar protocolo"],
  },
  {
    path: "/comun?experiencia=legacy",
    required: [
      "Agora no território.",
      "Como o COMUN se organiza",
      "Sua próxima participação",
    ],
  },
  {
    path: "/comun/c/trabalho?experiencia=legacy",
    required: ["Abrir pauta prioritária", "Acompanhar ou colaborar"],
  },
];

const forbidden = ["raw_text", "private_contact", "internal_notes"];

for (const check of checks) {
  const response = await fetch(new URL(check.path, baseUrl));
  if (!response.ok) {
    fail(`${check.path} retornou status ${response.status}`);
    continue;
  }

  const html = normalize(await response.text());
  for (const requiredText of check.required) {
    if (!html.includes(normalize(requiredText))) {
      fail(`${check.path} nao contem o texto esperado: ${requiredText}`);
    }
  }

  if (!check.allowFormFieldNames) {
    for (const forbiddenText of forbidden) {
      if (html.includes(normalize(forbiddenText))) {
        fail(`${check.path} vazou texto proibido: ${forbiddenText}`);
      }
    }
  }

  ok(`${check.path} passou nas verificacoes de UI publica`);
}
