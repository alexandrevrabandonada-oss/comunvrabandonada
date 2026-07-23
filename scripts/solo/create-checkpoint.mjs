import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const output = path.resolve(outputArg?.slice(9) ?? ".solo-checkpoint");
const dbUrl = process.env.SUPABASE_DB_URL;
const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!dbUrl || !projectRef || !dbUrl.includes(projectRef)) {
  throw new Error("SOLO_CHECKPOINT_DATABASE_NOT_ALLOWLISTED");
}
mkdirSync(output, { recursive: true });

const postgres = (args) => {
  const result = spawnSync("docker", ["run", "--rm", "postgres:17", ...args], {
    encoding: "utf8",
    maxBuffer: 25 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const reason = (result.stderr.match(/(?:ERROR|FATAL):\s+([^\r\n]+)/)?.[1] ?? "database read failed").slice(0, 240);
    throw new Error(`SOLO_CHECKPOINT_DATABASE_READ_FAILED:${reason}`);
  }
  return result.stdout;
};

const schema = postgres(["pg_dump", dbUrl, "--schema-only", "--no-owner", "--no-privileges", "--no-comments"]);
writeFileSync(path.join(output, "schema.sql"), schema);

const remoteMigrations = postgres([
  "psql",
  dbUrl,
  "-XAtq",
  "-c",
  "select version from supabase_migrations.schema_migrations order by version",
]);
writeFileSync(path.join(output, "remote-migrations.txt"), remoteMigrations);

const localMigrations = execFileSync("git", ["ls-files", "supabase/migrations/*.sql"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((name) => path.basename(name, ".sql").split("_")[0])
  .join("\n");
writeFileSync(path.join(output, "local-migrations.txt"), `${localMigrations}\n`);

const countSql = String.raw`
create temp table _comun_checkpoint_counts(name text, count_value text);
do $$
declare
  item record;
  row_count bigint;
begin
  for item in
    select wanted.name
    from (values
      ('comun_pautas'),
      ('comun_archive_items'),
      ('comun_sidewalk_reports'),
      ('comun_communities')
    ) as wanted(name)
  loop
    if to_regclass(format('public.%I', item.name)) is null then
      insert into _comun_checkpoint_counts values (item.name, 'absent');
    else
      execute format('select count(*) from public.%I', item.name) into row_count;
      insert into _comun_checkpoint_counts values (item.name, row_count::text);
    end if;
  end loop;
end
$$;
select name, count_value from _comun_checkpoint_counts order by name;
`;
const counts = postgres(["psql", dbUrl, "-XAtq", "-F", ",", "-c", countSql]);
writeFileSync(path.join(output, "aggregate-counts.csv"), `table,count\n${counts}`);

const vercel = {
  project: "canonical",
  projectId: process.env.VERCEL_CANONICAL_PROJECT_ID ?? null,
  teamId: "team_LBVwyK8FQMO7tA3hzVXXeumF",
  productionAlias: "comunvrabandonada.vercel.app",
  previousDeployment: null,
  aliases: ["comunvrabandonada.vercel.app", "comunvrabandonada-git-main-alexandrevrabandonada-oss-projects.vercel.app"],
  source: "static-sanitized-metadata",
};
writeFileSync(path.join(output, "vercel.json"), `${JSON.stringify(vercel, null, 2)}\n`);

const manifest = {
  kind: "sanitized-technical-checkpoint",
  notABackup: true,
  appSha: process.env.APP_SHA,
  schemaFingerprint: createHash("sha256").update(schema).digest("hex"),
  createdAt: new Date().toISOString(),
};
writeFileSync(path.join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

for (const name of ["aggregate-counts.csv", "manifest.json", "vercel.json"]) {
  const content = readFileSync(path.join(output, name), "utf8");
  if (/@|service[_-]?role|object[_ -]?key|latitude|longitude|coordinates?/i.test(content)) {
    throw new Error(`SOLO_CHECKPOINT_PRIVATE_DATA:${name}`);
  }
}
console.log("COMUN_SANITIZED_CHECKPOINT_OK");
