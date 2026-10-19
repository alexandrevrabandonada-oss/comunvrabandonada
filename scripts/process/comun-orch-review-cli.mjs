import fs from 'node:fs';
import {verifyCompletion,reviewPortfolio} from './comun-orch-health.mjs';
// Offline independent read-only assessment; no provider, git, scheduler or ledger
// mutation is exposed. Callers must supply independently fetched source snapshots.
try {
  const operation=process.argv[2],input=JSON.parse(fs.readFileSync(0,'utf8'));
  if(!['verify','portfolio'].includes(operation))throw Error('READ_ONLY_REVIEW_OPERATION_REQUIRED');
  const result=operation==='verify'?verifyCompletion(input):reviewPortfolio(input);
  console.log(JSON.stringify(result));
  if(operation==='verify'&&result.status==='PENDING')process.exitCode=2;
}catch(error){console.log(JSON.stringify({status:'INDETERMINATE',reason:error.message,writes:0,authorized_effects:[]}));process.exitCode=2;}
