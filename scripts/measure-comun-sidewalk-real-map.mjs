import { performance } from "node:perf_hooks";

const sizes = [0, 25, 100, 500];
const runs = 200;
const mercator = (value) => Math.log(Math.tan(Math.PI / 4 + (value * Math.PI / 180) / 2));
const project = ([longitude, latitude]) => ({
  x: (longitude + 44.22) / (-43.98 + 44.22),
  y: (mercator(-22.43) - mercator(latitude)) / (mercator(-22.43) - mercator(-22.60)),
});

const rows = sizes.map((size) => {
  const points = Array.from({ length: size }, (_, index) => [-44.2 + (index % 25) * 0.008, -22.59 + (index % 20) * 0.007]);
  const samples = [];
  let clusterCount = 0;
  for (let run = 0; run < runs; run += 1) {
    const start = performance.now();
    const visible = points.map(project).filter((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
    const clusters = new Map();
    for (const point of visible) {
      const key = `${Math.floor(point.x * 20)}:${Math.floor(point.y * 20)}`;
      clusters.set(key, (clusters.get(key) ?? 0) + 1);
    }
    clusterCount = clusters.size;
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return {
    size,
    payloadBytes: Buffer.byteLength(JSON.stringify(points)),
    p95Ms: Number(samples[Math.floor(samples.length * 0.95)].toFixed(3)),
    clusters: clusterCount,
    renderedItems: Math.min(size, 100),
  };
});

console.log(JSON.stringify({ runs, rows, memoryMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)), externalRequests: 0 }, null, 2));
