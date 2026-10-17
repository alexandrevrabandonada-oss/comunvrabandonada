import fs from 'node:fs';

export const START = '<!-- ORCH_OBSERVER_CONTROL';
export const END = 'ORCH_OBSERVER_CONTROL -->';
export function readControl(file) {
  if (!file || !fs.existsSync(file)) return undefined;
  const raw=fs.readFileSync(file,'utf8');
  if(!raw.includes(START) && !raw.includes(END))return undefined;
  if(raw.split(START).length!==2 || raw.split(END).length!==2)throw Error('OBSERVER_MEMORY_INVALID');
  let control;
  try {control=JSON.parse(raw.split(START)[1].split(END)[0].trim());}
  catch {throw Error('OBSERVER_MEMORY_INVALID');}
  if(control?.version!==1 || !control.cursors || Array.isArray(control.cursors) || typeof control.cursors!=='object')
    throw Error('OBSERVER_MEMORY_INVALID');
  for(const [id,c] of Object.entries(control.cursors)) {
    if(!/^[a-z0-9-]+$/.test(id) || !/^[a-f0-9]{64}$/.test(c.input_fingerprint ?? '') ||
        !/^[a-f0-9]{64}$/.test(c.observation_fingerprint ?? '') ||
        !Number.isSafeInteger(c.no_change_count) || c.no_change_count<0 ||
        !Number.isSafeInteger(c.read_failures) || c.read_failures<0 || c.read_failures>2 ||
        typeof c.suspended!=='boolean' ||
        (c.suspended ? c.next_probe_at!==null : !Number.isFinite(Date.parse(c.next_probe_at))))
      throw Error('OBSERVER_MEMORY_INVALID');
  }
  return control;
}

// Caller combines this block with the short summary it already must persist.
// It is never an independent scheduler or an automatic runtime write.
export function controlBlock(control) {return `${START}\n${JSON.stringify(control)}\n${END}`;}
