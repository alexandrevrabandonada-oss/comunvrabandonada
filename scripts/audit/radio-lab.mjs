import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const statePath = path.join(root, 'tmp/radio-lab-owner.json');
export function cleanEnv() {
  return Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(path|systemroot|windir|comspec|pathext|temp|tmp|home|userprofile|localappdata|appdata|programfiles|programfiles\(x86\)|programdata|systemdrive|number_of_processors)$/i.test(k)));
}
export function command(bin, args, options = {}) {
  const r = spawnSync(bin, args, { cwd: root, encoding: 'utf8', env: cleanEnv(), timeout: 30000, ...options });
  if (r.status !== 0) throw new Error(`${bin} failed (${r.status ?? r.error?.code}); inspect private laboratory log`);
  return r.stdout;
}
export function cli(args, options = {}) {
  if (process.env.AUDIT_SUPABASE_BIN) {
    assert.ok(path.isAbsolute(process.env.AUDIT_SUPABASE_BIN));
    return command(process.env.AUDIT_SUPABASE_BIN, args, options);
  }
  return process.platform === 'win32'
    ? command('cmd.exe', ['/d', '/c', 'npx', '--offline', 'supabase', ...args], options)
    : command('npx', ['--offline', 'supabase', ...args], options);
}
export function state() {
  const s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.match(s.id, /^audit_radio_[a-f0-9]{12}$/);
  assert.equal(s.dir, path.join(root, 'tmp', s.id));
  assert.equal(fs.readFileSync(path.join(s.dir, '.owner'), 'utf8'), s.id);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(s.dir, 'supabase/config.toml'))).digest('hex'), s.configHash);
  return s;
}
export function assertOwned(s = state()) {
  const host = command('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']).trim();
  assert.match(host, /^(npipe:\/\/|unix:\/\/)/, 'Refuse nonlocal Docker endpoint');
  const result = JSON.parse(command('docker', ['inspect', `supabase_db_${s.id}`]));
  assert.equal(result[0].Config.Labels['com.supabase.cli.project'], s.id);
  const ports = result[0].NetworkSettings.Ports['5432/tcp'];
  assert.ok(ports.some(p => p.HostPort === '56432'));
  return s;
}
export function localStatus(s = assertOwned()) {
  const raw = cli(['status', '--workdir', s.dir, '-o', 'env']);
  const env = Object.fromEntries(raw.split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
  }));
  assert.match(env.API_URL, /^http:\/\/(127\.0\.0\.1|localhost):56431$/);
  const dbUrl = new URL(env.DB_URL);
  assert.ok(['postgres:', 'postgresql:'].includes(dbUrl.protocol));
  assert.ok(['localhost', '127.0.0.1'].includes(dbUrl.hostname));
  assert.equal(dbUrl.port, '56432');
  assert.ok(env.ANON_KEY && env.SERVICE_ROLE_KEY);
  return env;
}
export function sql(query) {
  const s = assertOwned(); // Every SQL write/read revalidates exact owned container.
  return command('docker', ['exec', '-i', `supabase_db_${s.id}`, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: query });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const action = process.argv[2];
  if (action === 'prepare') {
    assert.ok(!fs.existsSync(statePath), 'Lab already recorded: inspect it, do not overwrite');
    assert.equal(cli(['--version']).trim(), '2.117.0', 'Use recorded CLI version');
    const id = `audit_radio_${crypto.randomBytes(6).toString('hex')}`;
    const dir = path.join(root, 'tmp', id);
    fs.mkdirSync(path.join(dir, 'supabase/migrations'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.owner'), id, { mode: 0o600 });
    let config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
    config = config.replace(/^project_id = .*$/m, `project_id = "${id}"`)
      .replace(/554(\d\d)/g, '564$1')
      .replace(/(\[db.seed\][\s\S]*?)enabled = true/, '$1enabled = false')
      .replace(/inspector_port = 8083/, 'inspector_port = 8183');
    fs.writeFileSync(path.join(dir, 'supabase/config.toml'), config);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/audit/radio-lab-migrations.json')));
    for (const item of manifest.files) {
      const bytes = fs.readFileSync(path.join(root, item.path));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256);
      fs.writeFileSync(path.join(dir, 'supabase/migrations', path.basename(item.path)), bytes);
    }
    fs.writeFileSync(statePath, JSON.stringify({ id, dir, configHash: crypto.createHash('sha256').update(config).digest('hex'), cli: '2.117.0' }, null, 2), { mode: 0o600 });
    console.log(`PREPARED ${id}: ${manifest.files.length} pinned migrations; seeds disabled`);
  } else if (action === 'start') {
    const s = state();
    const host = command('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']).trim();
    assert.match(host, /^(npipe:\/\/|unix:\/\/)/);
    assert.equal(command('docker', ['ps', '-aq', '--filter', `label=com.supabase.cli.project=${s.id}`]).trim(), '', 'Refuse existing stack');
    assert.equal(cli(['--version']).trim(), s.cli);
    const log = fs.openSync(path.join(s.dir, `startup-${Date.now()}.private.log`), 'wx', 0o600);
    try { cli(['start', '--workdir', s.dir, '--exclude', 'studio,postgres-meta,edge-runtime,logflare,vector,supavisor,imgproxy,realtime'], { stdio: ['ignore', log, log], timeout: 300000 }); }
    finally { fs.closeSync(log); }
    assertOwned(s); localStatus(s);
    console.log('LAB_READY: owned local Auth/Postgres/Storage, no hosted configuration');
  } else if (action === 'stop') {
    const s = assertOwned();
    cli(['stop', '--workdir', s.dir, '--no-backup']);
    console.log('OWNED_LAB_STOPPED');
  } else throw new Error('Expected prepare, start or stop');
}
