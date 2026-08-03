import pg from "pg";

const { Client } = pg;
const databaseUrl =
  process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ??
  process.env.PR23_DATABASE_URL ??
  "";
if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d{1,5}\/postgres(?:[/?]|$)/.test(
    databaseUrl,
  )
)
  throw new Error("COMUN_RELATA_LOCAL_DATABASE_REQUIRED");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
const { rows } = await client.query(`
  select retention_class, count(*)::int as review_candidates
  from private.comun_relata_reports
  where review_after <= now()
  group by retention_class
  order by retention_class
`);
await client.end();
console.log(
  JSON.stringify({
    mode: "dry_run",
    policyVersion: "relata-retention-proposal-v1",
    deletesExecuted: 0,
    classes: rows,
    containsPersonalData: false,
    remote: "not_contacted",
  }),
);
