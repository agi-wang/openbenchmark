// CLI summary of the accumulated benchmark history.
//   node stats.js            human-readable table, sorted by mean TPS
//   node stats.js --json     the dashboard /api/stats payload as JSON

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseNdjson, computeStats } from './lib/stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'data', 'results.ndjson');

if (!existsSync(DATA_FILE)) {
  console.log('No benchmark data yet. Run `node benchmark.js` first.');
  process.exit(0);
}

const records = parseNdjson(readFileSync(DATA_FILE, 'utf-8'));
const stats = computeStats(records);

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(stats));
  process.exit(0);
}

const sorted = [...stats].sort((a, b) => (b.stats.tps.mean || 0) - (a.stats.tps.mean || 0));
for (const s of sorted) {
  const t = s.stats.tps;
  console.log(
    `[${s.provider}] ${s.model_name.padEnd(18)}  runs:${String(s.runs).padStart(3)}  ` +
    `mean:${t.mean.toFixed(1).padStart(6)}  p50:${t.p50.toFixed(1).padStart(6)}  ` +
    `p95:${t.p95.toFixed(1).padStart(6)}  p99:${t.p99.toFixed(1).padStart(6)}  |  ` +
    `TTFT:${s.stats.ttft.mean.toFixed(0).padStart(5)}ms`
  );
}
console.log(`\n${sorted.length} models, ${records.length} records.`);
