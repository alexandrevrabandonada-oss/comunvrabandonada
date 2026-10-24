import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { readFile, writeFile, mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Transform, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

// This harness has no remote-source mode. Both databases are generated here,
// network-isolated, disposable and synthetic. It cannot certify real backups.
const IMAGE = "postgres:17";
const IMAGE_ID =
  "sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675";
const KIND = "SYNTHETIC_OFFSITE_ENCRYPTED_DUMP_NOT_REAL_BACKUP";
const MARKER = "COMUN_ENCRYPTED_RECOVERY_FAILED";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sink = () =>
  new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });

function run(binary, args, input) {
  const result = spawnSync(binary, args, {
    input,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error(MARKER);
  return result.stdout.trim();
}

function child(binary, args) {
  const process = spawn(binary, args, {
    stdio: ["pipe", "pipe", "ignore"],
    windowsHide: true,
    timeout: 120_000,
  });
  // Attach the rejection handler immediately, including when a pipe fails first.
  const finished = new Promise((resolve, reject) => {
    process.once("error", () => reject(new Error(MARKER)));
    process.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error(MARKER)),
    );
  });
  finished.catch(() => {});
  return { process, finished };
}

export function assertReceipt(receipt) {
  const fields = [
    "kind",
    "image",
    "imageId",
    "ageVersion",
    "createdAt",
    "source",
    "syntheticRows",
    "cipherSha256",
    "plainSha256",
    "plaintextDumpPersisted",
    "sourceCleanupAbsent",
    "keyCustody",
  ];
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Object.keys(receipt).sort().join(",") !== fields.sort().join(",") ||
    receipt?.kind !== KIND ||
    receipt?.image !== IMAGE ||
    receipt?.imageId !== IMAGE_ID ||
    receipt?.ageVersion !== "v1.3.2" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      receipt?.createdAt ?? "",
    ) ||
    !Number.isFinite(Date.parse(receipt.createdAt)) ||
    receipt?.plaintextDumpPersisted !== false ||
    receipt?.sourceCleanupAbsent !== true ||
    receipt?.keyCustody !== "EPHEMERAL_SYNTHETIC_NOT_REAL_RECOVERY_KEY" ||
    !/^[a-f0-9]{64}$/.test(receipt?.cipherSha256 ?? "") ||
    !/^[a-f0-9]{64}$/.test(receipt?.plainSha256 ?? "") ||
    receipt?.syntheticRows !== 2 ||
    receipt?.source !== "OWNED_NETWORK_NONE_DISPOSABLE_DATABASE"
  )
    throw new Error(MARKER);
}

async function database(action) {
  if (
    run("docker", ["image", "inspect", IMAGE, "--format", "{{.Id}}"]) !==
    IMAGE_ID
  )
    throw new Error(MARKER);
  const name = `comun-encrypted-lab-${randomBytes(12).toString("hex")}`;
  let attempted = false;
  try {
    attempted = true;
    run("docker", [
      "run",
      "--detach",
      "--rm",
      "--pull=never",
      "--name",
      name,
      "--label",
      "comun.recovery.scope=synthetic-disposable",
      "--label",
      `comun.recovery.owner=${name}`,
      "--network",
      "none",
      "--memory",
      "512m",
      "--pids-limit",
      "128",
      "--tmpfs",
      "/var/lib/postgresql/data:rw,nosuid,nodev,size=256m",
      "-e",
      `POSTGRES_PASSWORD=${randomBytes(32).toString("hex")}`,
      IMAGE,
    ]);
    const deadline = Date.now() + 60_000;
    while (true) {
      const probe = spawnSync(
        "docker",
        ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
        {
          stdio: "ignore",
          timeout: 5000,
          windowsHide: true,
        },
      );
      if (!probe.error && probe.status === 0) break;
      if (Date.now() >= deadline) throw new Error(MARKER);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return await action(name);
  } finally {
    if (attempted) {
      // Exact owned random name only. Never operate on existing Supabase stacks.
      const owner = spawnSync(
        "docker",
        [
          "inspect",
          "--format",
          '{{index .Config.Labels "comun.recovery.owner"}}',
          name,
        ],
        { encoding: "utf8", timeout: 10_000, windowsHide: true },
      );
      if (owner.error || (owner.status === 0 && owner.stdout.trim() !== name))
        throw new Error(MARKER);
      if (owner.status === 0) run("docker", ["rm", "--force", name]);
      const remaining = run("docker", [
        "ps",
        "--all",
        "--filter",
        `name=^/${name}$`,
        "--format",
        "{{.Names}}",
      ]);
      if (remaining !== "") throw new Error(MARKER);
    }
  }
}

async function decryptDigest(age, identity, encrypted) {
  const decode = child(age, ["--decrypt", "--identity", identity, encrypted]);
  const digest = createHash("sha256");
  const tap = new Transform({
    transform(chunk, _encoding, done) {
      digest.update(chunk);
      done(null, chunk);
    },
  });
  try {
    await Promise.all([
      pipeline(decode.process.stdout, tap, sink()),
      decode.finished,
    ]);
    return digest.digest("hex");
  } finally {
    if (decode.process.exitCode === null) decode.process.kill();
  }
}

export async function prepare({ root, age, keygen }) {
  if (
    ![root, age, keygen].every(
      (value) => typeof value === "string" && path.isAbsolute(value),
    )
  )
    throw new Error(MARKER);
  const dir = await mkdtemp(path.join(root, "comun-encrypted-proof-"));
  const identity = path.join(dir, "synthetic-identity.txt");
  const encrypted = path.join(dir, "synthetic.dump.age");
  let complete = false;
  try {
    const version = run(age, ["--version"]);
    if (version !== "v1.3.2") throw new Error(MARKER);
    run(keygen, ["--output", identity]);
    const recipient = run(keygen, ["-y", identity]);
    if (!/^age1[0-9a-z]+$/.test(recipient)) throw new Error(MARKER);
    let plainSha256;
    await database(async (name) => {
      run(
        "docker",
        ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
        "create table public.comun_recovery_synthetic(id integer primary key, label text not null); insert into public.comun_recovery_synthetic values (1,'synthetic-A'),(2,'synthetic-B');",
      );
      const dump = child("docker", [
        "exec",
        name,
        "pg_dump",
        "-U",
        "postgres",
        "--format=custom",
        "--schema=public",
        "--no-owner",
        "--no-acl",
      ]);
      const seal = child(age, ["--encrypt", "--recipient", recipient]);
      const digest = createHash("sha256");
      const tap = new Transform({
        transform(chunk, _encoding, done) {
          digest.update(chunk);
          done(null, chunk);
        },
      });
      try {
        await Promise.all([
          pipeline(dump.process.stdout, tap, seal.process.stdin),
          pipeline(
            seal.process.stdout,
            createWriteStream(encrypted, { flags: "wx", mode: 0o600 }),
          ),
          dump.finished,
          seal.finished,
        ]);
        plainSha256 = digest.digest("hex");
      } finally {
        for (const entry of [dump, seal])
          if (entry.process.exitCode === null) entry.process.kill();
      }
    });
    if ((await decryptDigest(age, identity, encrypted)) !== plainSha256)
      throw new Error(MARKER);
    const receipt = {
      kind: KIND,
      image: IMAGE,
      imageId: IMAGE_ID,
      ageVersion: "v1.3.2",
      createdAt: new Date().toISOString(),
      source: "OWNED_NETWORK_NONE_DISPOSABLE_DATABASE",
      syntheticRows: 2,
      cipherSha256: hash(await readFile(encrypted)),
      plainSha256,
      plaintextDumpPersisted: false,
      sourceCleanupAbsent: true,
      keyCustody: "EPHEMERAL_SYNTHETIC_NOT_REAL_RECOVERY_KEY",
    };
    assertReceipt(receipt);
    await writeFile(
      path.join(dir, "receipt.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
      { flag: "wx", mode: 0o600 },
    );
    complete = true;
    return {
      result: "SYNTHETIC_ENCRYPTED_DUMP_PREPARED",
      directory: dir,
      encryptedFile: encrypted,
    };
  } finally {
    if (!complete) await rm(dir, { recursive: true, force: true });
  }
}

export async function verify({ directory, downloaded, age }) {
  if (
    ![directory, downloaded, age].every(
      (value) => typeof value === "string" && path.isAbsolute(value),
    )
  )
    throw new Error(MARKER);
  if (run(age, ["--version"]) !== "v1.3.2") throw new Error(MARKER);
  const dir = path.resolve(directory);
  if (
    !path.isAbsolute(directory) ||
    !path.basename(dir).startsWith("comun-encrypted-proof-") ||
    !path.isAbsolute(downloaded)
  )
    throw new Error(MARKER);
  const receipt = JSON.parse(
    await readFile(path.join(dir, "receipt.json"), "utf8"),
  );
  assertReceipt(receipt);
  const identity = path.join(dir, "synthetic-identity.txt");
  const encrypted = path.resolve(downloaded);
  if (
    (await stat(encrypted)).size > 1024 * 1024 ||
    hash(await readFile(encrypted)) !== receipt.cipherSha256
  )
    throw new Error(MARKER);
  if ((await decryptDigest(age, identity, encrypted)) !== receipt.plainSha256)
    throw new Error(MARKER);
  const corrupt = Buffer.from(await readFile(encrypted));
  corrupt[corrupt.length - 1] ^= 1;
  const corruptPath = path.join(
    dir,
    `corrupted-${randomBytes(8).toString("hex")}.age`,
  );
  let corruptionRejected = false;
  try {
    await writeFile(corruptPath, corrupt, { flag: "wx", mode: 0o600 });
    try {
      await decryptDigest(age, identity, corruptPath);
    } catch {
      corruptionRejected = true;
    }
  } finally {
    await rm(corruptPath, { force: true });
  }
  if (!corruptionRejected) throw new Error(MARKER);
  await database(async (name) => {
    const decode = child(age, ["--decrypt", "--identity", identity, encrypted]);
    const restore = child("docker", [
      "exec",
      "-i",
      name,
      "pg_restore",
      "-U",
      "postgres",
      "--dbname=postgres",
      "--clean",
      "--if-exists",
      "--single-transaction",
      "--exit-on-error",
      "--no-owner",
      "--no-acl",
    ]);
    try {
      await Promise.all([
        pipeline(decode.process.stdout, restore.process.stdin),
        pipeline(restore.process.stdout, sink()),
        decode.finished,
        restore.finished,
      ]);
      const count = run("docker", [
        "exec",
        name,
        "psql",
        "-U",
        "postgres",
        "-Atc",
        "select count(*) from public.comun_recovery_synthetic where (id=1 and label='synthetic-A') or (id=2 and label='synthetic-B');",
      ]);
      if (count !== "2") throw new Error(MARKER);
    } finally {
      for (const entry of [decode, restore])
        if (entry.process.exitCode === null) entry.process.kill();
    }
  });
  if (hash(await readFile(encrypted)) !== receipt.cipherSha256)
    throw new Error(MARKER);
  await rm(identity);
  const result = {
    ...receipt,
    verifiedAt: new Date().toISOString(),
    result: "SYNTHETIC_OFFSITE_RESTORE_PASS",
    downloadedCipherIntegrity: true,
    decryptedDumpIntegrity: true,
    corruptCipherRejected: true,
    restoredRows: 2,
    restoreCleanupAbsent: true,
    syntheticIdentityRemoved: true,
    realDataExported: false,
    actualDurableRecovery: "NOT_PROVEN",
  };
  await writeFile(
    path.join(dir, "verified.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    { flag: "wx", mode: 0o600 },
  );
  return result;
}

export function parseArguments(args) {
  const mode = args[0];
  const required =
    mode === "prepare"
      ? ["--root", "--age", "--keygen"]
      : mode === "verify"
        ? ["--directory", "--downloaded", "--age"]
        : [];
  if (required.length === 0 || args.length !== 7) throw new Error(MARKER);
  const values = {};
  for (let index = 1; index < args.length; index += 2) {
    const name = args[index],
      value = args[index + 1];
    if (
      !required.includes(name) ||
      name in values ||
      typeof value !== "string" ||
      !path.isAbsolute(value)
    )
      throw new Error(MARKER);
    values[name] = value;
  }
  if (!required.every((name) => name in values)) throw new Error(MARKER);
  return { mode, values };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const { mode, values } = parseArguments(process.argv.slice(2));
    const result =
      mode === "prepare"
        ? await prepare({
            root: values["--root"],
            age: values["--age"],
            keygen: values["--keygen"],
          })
        : await verify({
            directory: values["--directory"],
            downloaded: values["--downloaded"],
            age: values["--age"],
          });
    console.log(JSON.stringify(result));
  } catch {
    console.error(MARKER);
    process.exitCode = 1;
  }
}
