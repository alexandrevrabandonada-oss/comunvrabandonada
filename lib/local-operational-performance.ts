export type LocalPerformanceSample={
  surface:string;items:number;httpStatus:number;requestMs:number;payloadBytes:number;
  queryCount:number;queryTotalMs:number;largestQueryMs:number;rssBeforeBytes:number;
  rssAfterBytes:number;heapUsedBytes:number;renderedItems:number;serializedBytes:number;
  originalAssetsLoaded:number;
};
const sensitiveKey=/(cookie|token|secret|contact|email|auth.?id|private|object.?key|note)/i;
export function assertLocalPerformanceTarget(raw:string){const url=new URL(raw);if(!["localhost","127.0.0.1","::1"].includes(url.hostname))throw new Error("COMUN_LOCAL_PERF_REMOTE_HOST_REFUSED");return url}
export function requireLocalPerformance(env:Readonly<Record<string,string|undefined>>=process.env){if(env.COMUN_LOCAL_PERF!=="true")throw new Error("COMUN_LOCAL_PERF_DISABLED")}
export function sanitizeLocalPerformance<T>(value:T):T{
  if(Array.isArray(value))return value.map(sanitizeLocalPerformance) as T;
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([key])=>!sensitiveKey.test(key)).map(([key,item])=>[key,sanitizeLocalPerformance(item)])) as T;
  return value;
}
export function countOriginalAssets(resources:readonly string[]){return resources.filter(resource=>/(original|private|raw-upload)/i.test(new URL(resource,"http://localhost").pathname)).length}
export function percentile95(values:readonly number[]){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*.95)-1]}
