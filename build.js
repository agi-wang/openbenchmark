// Static site generator for Cloudflare Pages.
//
// Reads the accumulated history (data/results.ndjson), computes the aggregated
// JSON the dashboard expects, and writes a self-contained `dist/` containing the
// front-end plus pre-rendered data. `dist/` is the Direct-Upload artifact:
//   npx wrangler pages deploy dist
//
// No network, no secrets — safe to run anywhere. Only `dist/` reaches Pages.

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseNdjson, computeStats, computeTotals, computeTimeseries } from './lib/stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'data', 'results.ndjson');
const PUBLIC_DIR = join(__dirname, 'public');
const DIST_DIR = join(__dirname, 'dist');

const text = existsSync(DATA_FILE) ? readFileSync(DATA_FILE, 'utf-8') : '';
const records = parseNdjson(text);

// Rebuild dist/ from scratch, then layer the static data files on top.
rmSync(DIST_DIR, { recursive: true, force: true });
cpSync(PUBLIC_DIR, DIST_DIR, { recursive: true });
mkdirSync(join(DIST_DIR, 'data'), { recursive: true });

const stats = computeStats(records);
const totals = { ...computeTotals(records), generated_at: new Date().toISOString() };
const timeseries = computeTimeseries(records);

writeFileSync(join(DIST_DIR, 'data', 'stats.json'), JSON.stringify(stats));
writeFileSync(join(DIST_DIR, 'data', 'totals.json'), JSON.stringify(totals));
writeFileSync(join(DIST_DIR, 'data', 'timeseries.json'), JSON.stringify(timeseries));

console.log(`Built dist/ from ${records.length} records → ${stats.length} models, ${totals.total_runs} successful runs, ${timeseries.length} timeseries points`);
