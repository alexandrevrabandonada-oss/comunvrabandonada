import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'yaml';
test('E1 workflow parses and retains bridge triggers',()=>{const doc=parse(fs.readFileSync('.github/workflows/comun-48-5-a4-r2-e1-external-ledger.yml','utf8'));assert.ok(doc.on.workflow_dispatch);assert.ok(doc.on.push);assert.ok(doc.jobs.bridge);assert.match(doc.jobs.bridge.steps[0].with.ref,/inputs\.expected_main_sha/);});
