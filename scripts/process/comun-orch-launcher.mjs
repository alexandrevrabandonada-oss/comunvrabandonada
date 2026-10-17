import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

// Installed next to a manifest of the exact tested source. No network install or daemon.
const directory = path.dirname(fileURLToPath(import.meta.url));
try {
  const args = process.argv.slice(2);
  const repo = args.includes("--repo")
    ? args[args.indexOf("--repo") + 1]
    : process.cwd();
  const git = (...a) =>
    execFileSync("git", ["-C", repo, ...a], {
      encoding: "utf8",
      timeout: 30000,
    }).trim();
  if (
    git("remote", "get-url", "origin") !==
    "https://github.com/alexandrevrabandonada-oss/comunvrabandonada.git"
  )
    throw Error("REPOSITORY_CHANGED");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, "manifest.json"), "utf8"),
  );
  const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
  for (const name of [
    "comun-orch-v2.mjs",
    "comun-orch-runtime.mjs",
    "comun-orch-launcher.mjs",
    "comun-orch-adapter.mjs",
    "orch-v2-candidate.mjs",
    "comun-orch-github-executor.mjs",
  ]) {
    const local = fs.readFileSync(path.join(directory, name));
    const canonical = execFileSync(
      "git",
      [
        "-C",
        repo,
        "show",
        `refs/comun/roadmap-execution:scripts/process/${name}`,
      ],
      { timeout: 30000 },
    );
    if (
      digest(local) !== manifest.files[name] ||
      digest(canonical) !== manifest.files[name]
    )
      throw Error("INSTALLED_SOURCE_DRIFT");
  }
  const runtime = await import(
    pathToFileURL(path.join(directory, "comun-orch-runtime.mjs"))
  );
  const ctx = runtime.context(path.resolve(repo));
  if(path.resolve(ctx.common)!==path.resolve(manifest.common))throw Error('COMMON_DIR_CHANGED');
  if(!Number.isInteger(Number(args.includes('--budget')?args[args.indexOf('--budget')+1]:1)) ||
    Number(args.includes('--budget')?args[args.indexOf('--budget')+1]:1)<0 ||
    Number(args.includes('--budget')?args[args.indexOf('--budget')+1]:1)>1)throw Error('INVALID_MATERIAL_BUDGET');
  const option = (name, fallback) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  let result;
  if (args[0] === 'diagnose') {
    // Read-only local recovery snapshot. Does not acquire locks or query providers.
    const core = await import(pathToFileURL(path.join(directory, 'comun-orch-v2.mjs')));
    const {state, expectedHash} = runtime.loadState(ctx);
    const lock = runtime.inspectLock(ctx.common);
    const planned = core.plan(state, {now: Date.now(), material_budget: 1});
    const counts = Object.fromEntries(core.STATES.map(status => [
      status, state.tasks.filter(t => t.status === status).length,
    ]));
    const unobserved = state.tasks.filter(t =>
      t.status === 'WAIT_EXTERNAL' && (!t.probe || !t.next_probe_at)
    ).map(t => t.task_id);
    result = {
      action: 'DIAGNOSE',
      read_only: true,
      lock: lock.state,
      canonical: ctx.canonical,
      ledger_initialized: expectedHash !== null,
      revision: state.revision,
      would_action: lock.state === 'FREE' ? planned.action : 'PROTECTED_NOOP',
      would_reason: lock.state === 'FREE' ? planned.reason : lock.state,
      counts,
      due_probe_count: planned.probes.length,
      unobserved_wait_external: unobserved,
      requires_reconciliation: unobserved.length > 0,
      tasks: state.tasks.map(t => ({
        task_id: t.task_id, status: t.status,
        pr_effect: t.pr_effect ?? null, target_pr: t.target_pr ?? null,
        next_probe_at: t.next_probe_at ?? null,
      })),
      notify: false, writes: 0, worktrees: 0,
    };
  } else if (args[0] === 'create-pr') {
    const executor=await import(pathToFileURL(path.join(directory,'comun-orch-github-executor.mjs')));
    result=executor.createPullRequest(ctx,JSON.parse(fs.readFileSync(option('--event'),'utf8')));
  } else if (["record", "observe"].includes(args[0])) {
    result = runtime[args[0]](ctx, JSON.parse(fs.readFileSync(option("--event"), "utf8")));
  } else if (args[0] === 'tick' || args.length === 0) {
    result = args.includes('--hold')
      ? {action:'NOOP',reason:'REVERSIBLE_CANARY_HOLD',notify:false,writes:0,worktrees:0}
      : runtime.tick(ctx, {
          simulate: args.includes("--simulate"),
          material_budget: Number(option("--budget", "1")),
        });
  } else {
    throw Error('INVALID_ORCH_COMMAND');
  }
  console.log(JSON.stringify(result));
} catch (error) {
  const reason = error instanceof Error ? error.message : 'UNKNOWN_LAUNCHER_ERROR';
  console.log(JSON.stringify({
    action: 'PROTECTED_STOP',
    protected: true,
    fatal: true,
    reason,
    error_fingerprint: createHash('sha256').update(reason).digest('hex'),
    requires_attention: true,
    // Failure may have occurred after a side effect. Never claim zero writes.
    notify: false,
    writes: null,
    worktrees: null,
  }));
  process.exitCode = 1;
}
