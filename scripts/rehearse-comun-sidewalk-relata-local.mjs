import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const databaseUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL || process.env.DATABASE_URL;
assert.match(databaseUrl || "", /^postgres(?:ql)?:\/\/(?:[^@]+@)?(?:localhost|127\.0\.0\.1):\d+\/postgres/);
const client = new pg.Client({ connectionString: databaseUrl });
const hash = (value) => createHash("sha256").update(value).digest("hex");
await client.connect();
await client.query("begin");
try {
  const tokenHash = hash(`wallet-${randomBytes(24).toString("hex")}`);
  const receipt = randomBytes(24).toString("base64url");
  await client.query("select * from public.comun_participation_wallet_create($1,$2)", [tokenHash, hash(`recovery-${receipt}`)]);
  const pauta = (await client.query("select id from public.comun_pauta_spaces where slug='calcadas-em-circulacao' limit 1")).rows[0];
  assert.ok(pauta?.id);
  const record = (await client.query(
    `insert into public.comun_sidewalk_records
      (pauta_id,slug,name,geometry_geojson,categories,impact_level,affected_groups,status,verification_status,visibility,public_summary,public_location_level)
     values ($1,$2,$3,null,$4,'medium',$5,'pending','unverified','internal',$6,'hidden') returning id`,
    [pauta.id, `local-48-0j-${Date.now()}`, "Fixture sintética 48.0J", ["broken_surface"], ["general_public"], "Fixture local sem dado real"],
  )).rows[0];
  const proof = hash(`sidewalk-possession-v1:${record.id}:${tokenHash}`);
  const create = (await client.query(
    "select * from public.comun_sidewalk_relata_create($1,$2,$3,$4,$5,$6,$7,$8)",
    [tokenHash, record.id, proof, `j-idem-${Date.now()}`, receipt, "A calçada sintética dificulta a passagem e precisa de revisão.", "attention", "sidewalk-relata-v1"],
  )).rows[0];
  assert.equal(create.state, "stored_private");
  assert.match(create.protocol, /^COMUN-RELATA-[A-F0-9]{16}$/);
  const link = create.link_id;
  const blocked = await client.query("select * from public.comun_sidewalk_jurisdiction_set($1,$2,$3,$4)", [tokenHash, link, "private_property_frontage", null]);
  assert.equal(blocked.rows[0].state, "jurisdiction_required");
  const jurisdiction = (await client.query("select * from public.comun_sidewalk_jurisdiction_set($1,$2,$3,$4)", [tokenHash, link, "public_municipal_sidewalk", null])).rows[0];
  assert.equal(jurisdiction.state, "forwarding_eligible");
  const packageRow = (await client.query("select * from public.comun_sidewalk_forwarding_prepare($1,$2)", [tokenHash, link])).rows[0];
  assert.equal(packageRow.state, "package_ready_channel_degraded");
  assert.equal(packageRow.service_expectation.includes("7 dias"), true);
  assert.equal(packageRow.service_expectation.includes("30 dias"), true);
  const status = (await client.query("select * from public.comun_sidewalk_relata_status($1,$2)", [tokenHash, link])).rows[0];
  assert.equal(status.state, "package_ready_channel_degraded");
  await client.query("rollback");
  console.log(JSON.stringify({ result: "COMUN_SIDEWALK_48_0J_DB_GREEN", protocolShape: true, jurisdictionGuard: true, packageState: packageRow.state, remote: "not_contacted" }));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally { await client.end(); }
