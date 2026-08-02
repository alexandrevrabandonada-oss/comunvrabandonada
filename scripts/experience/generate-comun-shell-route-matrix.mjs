import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveComunShellRoute,
  COMUN_SHELL_CONTRACTS,
} from "../../lib/comun-shell-contract.ts";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const appRoot = path.join(root, "app");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.name === "page.tsx") files.push(absolute);
  }
  return files;
}

function toRoute(file) {
  const relative = path
    .relative(appRoot, path.dirname(file))
    .replaceAll(path.sep, "/");
  return relative ? `/${relative}` : "/";
}

function surface(route) {
  if (/\/admin\//.test(route)) return "operation/admin";
  if (/calcadas|\/mapa/.test(route)) return "map/miniapp";
  if (/contribuir|relatar|registrar|conta|entrar|acesso|onboarding/.test(route))
    return "form/task";
  if (/radio|musica|historias-orais/.test(route)) return "player/media";
  return "content/navigation";
}

const files = await walk(appRoot);
const rows = files
  .map((file) => {
    const route = toRoute(file);
    const resolved = resolveComunShellRoute(route);
    const contract = COMUN_SHELL_CONTRACTS[resolved.mode];
    return { route, ...resolved, surface: surface(route), contract };
  })
  .sort((a, b) => a.route.localeCompare(b.route, "pt-BR"));

const counts = rows.reduce((result, row) => {
  result[row.mode] = (result[row.mode] ?? 0) + 1;
  return result;
}, {});

const lines = [
  "# Tijolo 47.9A2 — matriz canônica de rotas e shell",
  "",
  "> Gerado por `npm run experience:shell:matrix`. A classificação executável vive em `lib/comun-shell-contract.ts`; componentes não mantêm listas paralelas de pathname.",
  "",
  `Rotas inventariadas: **${rows.length}**. Contagem por modo: ${Object.entries(
    counts,
  )
    .map(([mode, count]) => `\`${mode}\` ${count}`)
    .join(" · ")}.`,
  "",
  "| Rota | Modo | Grupo | Superfície | App bar | Bottom nav | Footer | Scroll |",
  "|---|---|---|---|---|---|---|---|",
  ...rows.map(
    (row) =>
      `| \`${row.route}\` | \`${row.mode}\` | \`${row.routeGroup}\` | ${row.surface} | \`${row.contract.appBar}\` | \`${row.contract.bottomNavigation}\` | \`${row.contract.footer}\` | \`${row.contract.scroll}\` |`,
  ),
  "",
  "## Inventário transversal",
  "",
  "- `ComunAppShell` e `ComunShell`: shell público/membro, PWA, skip link, desktop header, app bar e chrome condicionado pelo contrato.",
  "- `ComunMobileAppBar`: app bar contextual; metadados de rota vêm do contrato e páginas podem fornecer título/contexto da entidade.",
  "- `ComunMobileNavigation`: cinco roots, safe area, badge sanitizado, retorno ao topo, scroll e href/filtros preservados por aba.",
  "- `AdminShell`: administração ampla existente; a Central piloto usa `ComunOperationalShell` para comprovar separação administrativa.",
  "- `MiniAppExperienceShell` e `PautaAppShell`: layouts aninhados de ferramenta/pauta; a flag é propagada sem quebrar deep links.",
  "- Mapas: `/comun/mapa*` e `/comun/calcadas*`; formulários: rotas de contribuição, relato, conta, acesso e registro; players/mídia: Rádio, música e histórias orais.",
  "- PWA: `ComunPwaRuntime`, manifest e service worker permanecem compartilhados; o shell V2 acrescenta `100dvh`, visual viewport e safe areas sem alterar a política de cache.",
  "",
  "## Regra de fallback",
  "",
  "Sem query, o App V2 canônico usa somente a classificação acima para decidir chrome, footer e navegação. `?experiencia=app-v2` permanece compatível e `?experiencia=legacy` preserva o rollback; nenhuma rota ou deep link é removido.",
];

await writeFile(
  path.join(root, "reports/current/comun-tijolo-47-9a2-route-matrix.md"),
  `${lines.join("\n")}\n`,
  "utf8",
);
console.log(`COMUN_SHELL_ROUTE_MATRIX_WRITTEN:${rows.length}`);
