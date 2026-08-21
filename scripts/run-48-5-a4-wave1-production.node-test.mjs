import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const runner=fs.readFileSync('scripts/run-48-5-a4-wave1-production.sh','utf8');
const workflow=fs.readFileSync('.github/workflows/comun-48-5-a4-r2-wave1.yml','utf8');
test('Wave 1 has only activation and disable-only modes',()=>{assert.match(runner,/wave1-only\|disable-only/);assert.doesNotMatch(runner,/db push|migration list|--include-all|db reset/);assert.match(workflow,/comun-48-5-a4-r2-production/);});
test('writer patch is ID-specific and minimal',()=>{assert.match(runner,/\/v9\/projects\/\$VERCEL_PROJECT_ID\/env\/\$id/);assert.match(runner,/--data "\{\\"value\\":\\"\$value\\"\}"/);assert.doesNotMatch(runner,/env add|--force|POST/);});
test('post-write failures roll back only A4 before completing',()=>{assert.match(runner,/ENABLED=true; audit_flags wave1-post; deploy_exact; smoke; snapshot postflight; compare/);assert.match(runner,/patch_a4 disabled/);assert.match(runner,/ROLLBACK_INCOMPLETE_REQUIRES_INTERVENTION/);});
test('runtime proof is GET/HEAD only and checks progressive markers',()=>{assert.match(runner,/specialized=photo&intake=wave1-smoke/);for(const marker of ['Como este material chegou até você?','Relação com a autoria','De quem é a voz?','Música incorporada possui análise própria'])assert.match(runner,new RegExp(marker));assert.doesNotMatch(runner,/\bcurl .* -X (POST|PUT)/);});
