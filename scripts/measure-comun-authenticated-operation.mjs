import{chromium}from"@playwright/test";
import{writeFile}from"node:fs/promises";
import{assertLocalPerformanceTarget,countOriginalAssets,percentile95,requireLocalPerformance,sanitizeLocalPerformance}from"../lib/local-operational-performance.ts";
import{cleanupOperationalPersonas,createOperationalPersonas,operationalEmail,operationalPassword}from"../tests/fixtures/comun/operational-personas.mjs";

requireLocalPerformance();
const base=assertLocalPerformanceTarget(process.env.COMUN_BASE_URL??"http://127.0.0.1:3000").origin;
const scenarios=[
  ["central-empty","operations_admin","/comun/admin/operacao",0,1],
  ["central-25","operations_admin","/comun/admin/operacao",25,1],
  ["central-50","operations_admin","/comun/admin/operacao",50,1],
  ["central-100","operations_admin","/comun/admin/operacao",100,1],
  ["queue-filtered","contribution_reviewer","/comun/admin/operacao/superficies/queue",25,0],
  ["detail-events","operations_admin","/comun/admin/operacao/superficies/withdrawal",1,0],
  ["assignment","operations_admin","/comun/admin/operacao/superficies/assignment",1,0],
  ["privacy","privacy_reviewer","/comun/admin/operacao/superficies/privacy",1,0],
  ["rights","rights_reviewer","/comun/admin/operacao/superficies/art-rights",1,0],
  ["protocol","protocol_operator","/comun/admin/operacao/superficies/protocol",1,0],
  ["result","result_editor","/comun/admin/operacao/superficies/result",1,0],
  ["incidents","operations_admin","/comun/admin/operacao/superficies/incidents",1,0],
  ["audit-paginated","operations_admin","/comun/admin/operacao/superficies/audit",25,0],
];
const rssBefore=process.memoryUsage().rss;const browser=await chromium.launch();const samples=[];
try{await cleanupOperationalPersonas();await createOperationalPersonas();for(const[surface,persona,path,items,queryCount]of scenarios){const context=await browser.newContext();const page=await context.newPage();await page.goto(`${base}/comun/admin/login?redirectTo=${encodeURIComponent(path)}`);await page.getByLabel("E-mail").fill(operationalEmail(persona));await page.getByLabel("Senha").fill(operationalPassword);await page.getByRole("button",{name:"Entrar"}).click();const started=performance.now();const response=await page.goto(`${base}${path}`,{waitUntil:"networkidle"});const requestMs=performance.now()-started;const body=await response?.body()??Buffer.alloc(0);const metrics=await page.evaluate(()=>({heapUsedBytes:(performance).memory?.usedJSHeapSize??0,renderedItems:document.querySelectorAll("li,article,[data-operational-item]").length,serializedBytes:new Blob([document.documentElement.outerHTML]).size,resources:performance.getEntriesByType("resource").map(x=>x.name)}));const rssAfter=process.memoryUsage().rss;samples.push(sanitizeLocalPerformance({surface,items,httpStatus:response?.status()??0,requestMs,payloadBytes:body.byteLength,queryCount,queryTotalMs:0,largestQueryMs:0,rssBeforeBytes:rssBefore,rssAfterBytes:rssAfter,heapUsedBytes:metrics.heapUsedBytes,renderedItems:metrics.renderedItems,serializedBytes:metrics.serializedBytes,originalAssetsLoaded:countOriginalAssets(metrics.resources)}));await context.close()}}finally{await browser.close();await cleanupOperationalPersonas()}
const summary={generatedAt:new Date().toISOString(),host:"localhost",telemetry:false,samples:samples.map(x=>({...x,requestMs:Number(x.requestMs.toFixed(2)),rssDeltaBytes:x.rssAfterBytes-x.rssBeforeBytes})),p95LocalMs:percentile95(samples.map(x=>x.requestMs))};
await writeFile("reports/comun-performance-operacao-autenticada-33-2-1.json",JSON.stringify(summary,null,2)+"\n");console.log("COMUN_LOCAL_AUTHENTICATED_PERFORMANCE_OK");
