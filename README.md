# OpenBenchmark

> Multi-provider LLM inference benchmark — a **static, self-updating dashboard** that measures and compares **throughput (TPS)** and **latency (TTFT)** across LLM API providers.

![OpenBenchmark dashboard](docs/screenshot.png)

OpenBenchmark runs the *same* fixed task against every model you configure, records **tokens/second** and **time-to-first-token**, and publishes a fast, filterable comparison dashboard to **Cloudflare Pages** — kept up to date automatically by a scheduled CI job.

There is **no server and no database to operate**: the data lives as append-only NDJSON in the repo (git *is* the database), and the published site is 100% static.

## Features

- 📊 **Performance Map** — a TTFT × TPS scatter plot; the **top-left** corner is the sweet spot (low latency + high throughput).
- 🔬 **Comparison matrix** — every column is sortable, so you can rank the *same* model across different providers/routes (e.g. GPT‑5.5 on four ChatGPT tiers, Claude across AWS/Windsurf/Max).
- 🔎 **Provider filter chips + model search** — every view reacts live.
- 🎯 **Selection** — click a point or row to highlight a model across all views and isolate it in the timeline.
- 📈 **Throughput timeline** — auto-capped to the fastest N models so it never turns into spaghetti.
- 🌐 **Bilingual UI** (English / 中文), auto-detected from the browser.
- 🤖 **Hands-off** — a CI runner re-benchmarks on a schedule, commits the data, rebuilds, and redeploys.
- 🔒 **Secret-safe** — API keys live only in environment variables / CI secrets. There are no hardcoded keys, and the deployed artifact contains no secrets.
- 🪶 **Zero runtime dependencies** — only Node's built-ins (`fetch`, `fs`, `http`).

## How it works

```
┌─ CI runner (hourly cron) ────────────────────────────────┐
│  node benchmark.js   → append data/results.ndjson         │
│  git commit & push   → history persists in the repo       │
│  node build.js       → dist/ (index.html + data/*.json)   │
│  wrangler pages deploy dist  → Cloudflare Pages (static)  │
└───────────────────────────────────────────────────────────┘
```

| File | Role |
| --- | --- |
| `benchmark.js` | Streams a fixed prompt to every configured model, measuring TTFT & TPS. Keys from env only. |
| `data/results.ndjson` | Single source of truth — one JSON record per run, append-only, pruned to `RETENTION_DAYS`. |
| `lib/stats.js` | Shared aggregation (per-model means, P50/P95/P99, timeseries). |
| `build.js` | NDJSON → `dist/`: the static front-end + pre-rendered JSON the dashboard fetches. |
| `public/index.html` | The dashboard (Chart.js + vanilla JS). |
| `server.js` | Zero-dependency static server for local preview. |

Only `dist/` is uploaded to Pages, so secrets never reach the public site.

## Quick start (local)

Requires **Node ≥ 20.6** (uses built-in `fetch` and `--env-file-if-exists`).

```bash
git clone https://github.com/<you>/openbenchmark.git
cd openbenchmark
cp .env.example .env        # fill in at least one provider key
npm run benchmark           # run one round → writes data/results.ndjson
npm run dev                 # build + serve → http://localhost:3456
```

| Command | What it does |
| --- | --- |
| `npm run benchmark` | Run the benchmark once (auto-loads `.env`). |
| `npm run build` | Generate `dist/` from `data/results.ndjson`. |
| `npm run serve` | Serve `dist/` locally. |
| `npm run dev` | Build + serve. |
| `npm run stats` | Print a summary table to the terminal (`node stats.js --json` for raw JSON). |

## Configuration

### Providers & models

Edit the `PROVIDERS` array in **`benchmark.js`**. Each entry:

```js
{
  name: 'OpenCode Go',
  apiBase: CFG.OPENCODE_GO_URL,
  apiKey: CFG.OPENCODE_GO_KEY,
  apiType: 'openai',          // 'openai' (chat/completions) or 'anthropic' (messages)
  serviceTier: 'fast',        // optional — OpenAI service_tier
  models: [
    { id: 'glm-5.1', name: 'GLM-5.1' },
    // ...
  ],
}
```

A provider whose key resolves to empty is **skipped automatically**, so you only test what you configure.

### API keys

Set them in `.env` locally (see [`.env.example`](.env.example)) or as CI secrets. URLs are **not** secret and ship with public defaults — override with the matching `*_URL` variable if you use a different gateway.

### Tuning

| Variable | Default | Meaning |
| --- | --- | --- |
| `RETENTION_DAYS` | `30` | History window kept in `results.ndjson`. `0` = keep everything. |
| `CONCURRENCY` *(in `benchmark.js`)* | `6` | Max parallel requests. |
| 1-hour skip *(built in)* | — | A model successfully measured < 1h ago is skipped that run. |
| `PROMPTS` *(in `benchmark.js`)* | fixed writing task | The benchmark task; identical for every model for a fair comparison. |

---

## Deploy to Cloudflare Pages

The dashboard is static, so any host works — but the CI is wired for **Cloudflare Pages** via `wrangler` (Direct Upload).

### 1 · Create a Cloudflare API token

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token**.
2. Either use the **“Edit Cloudflare Workers”** template, or create a *custom token* with at least:
   - **Account → Cloudflare Pages → Edit**
3. Copy the token. This is your **`CLOUDFLARE_API_TOKEN`**.

### 2 · Find your Account ID

Cloudflare dashboard → **Workers & Pages** (or any domain) → the **Account ID** is shown in the right sidebar. This is your **`CLOUDFLARE_ACCOUNT_ID`**.

### 3 · Name your project

Edit `name` in **`wrangler.toml`** (default `openbenchmark`). It becomes `https://<name>.pages.dev`.

```toml
name = "openbenchmark"
pages_build_output_dir = "dist"
```

### 4 · First deploy (manual, optional)

```bash
export CLOUDFLARE_API_TOKEN=...      # account auto-detected if you have a single account
npm run build
npx wrangler pages project create openbenchmark --production-branch=main
npx wrangler pages deploy dist --project-name=openbenchmark --branch=main
```

It’s now live at `https://openbenchmark.pages.dev`. (Once CI secrets are set, the workflow does this for you on every run.)

### 5 · Custom domain

Cloudflare dashboard → **Workers & Pages → your project → Custom domains → Set up a domain**.

> **Why `wrangler` instead of the Pages Git integration?** Pages’ built-in Git builds work for GitHub/GitLab, but this project commits data back to the repo each run and drives the deploy from CI for full control. Direct Upload also works from any Git host.

---

## Automate with GitHub Actions

The workflow [`.github/workflows/benchmark.yml`](.github/workflows/benchmark.yml) runs on a schedule: **benchmark → commit data → build → deploy**.

### 1 · Add repository secrets

Repo **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Required | Value |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | ✅ | From step 1 above. |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | From step 2 above. |
| `OPENCODE_GO_KEY`, `ZHIPU_API_KEY`, `CHATGPT_FREE_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, … | per provider | Your API keys — **only add the ones you actually use**. |

The full list of supported key names is in [`.env.example`](.env.example). A provider with no secret is silently skipped.

### 2 · Allow the workflow to push data back ⚠️

Each run commits the updated `data/results.ndjson` back to the repo. Grant write access:

> **Settings → Actions → General → Workflow permissions → select “Read and write permissions” → Save.**

The workflow already declares `permissions: contents: write`, so the built-in `GITHUB_TOKEN` can push — **no personal access token needed**. (This repo setting is the ceiling; if it’s left read-only, the push step fails.)

### 3 · Cost

For **public** repositories, GitHub Actions minutes are **free** — hourly runs cost nothing. Private repos draw from your included minutes.

### 4 · Run it

- **Scheduled** — hourly via the `cron` in the workflow (edit to taste).
- **Manual** — Actions tab → **Benchmark & Deploy → Run workflow**.
- **On push** — any push to `main` (except data-only commits) triggers it too.

> GitHub may delay scheduled runs during peak load, and **disables schedules after 60 days of repo inactivity** — push something or run it manually to re-arm.

That’s it. The dashboard now refreshes itself.

---

## Data format

`data/results.ndjson` — one JSON object per line:

```json
{"provider":"OpenCode Go","model_id":"glm-5.1","model_name":"GLM-5.1","run_at":"2026-06-02 00:36:40","prompt_type":"writing","input_tokens":83,"output_tokens":2048,"total_tokens":2131,"time_to_first_token_ms":1272.86,"total_time_ms":11610.29,"tokens_per_second":176.4,"duration_ms":11610.29,"success":1,"error":null}
```

- `run_at` is UTC `YYYY-MM-DD HH:MM:SS`.
- The build computes per-model means + P50/P95/P99 and the timeline from these records.
- **Reset the history**: empty the file, commit, then re-run —
  ```bash
  : > data/results.ndjson && git commit -am "data: reset" && git push
  # then trigger the workflow (Actions → Run workflow)
  ```

## Metrics

| Metric | Meaning |
| --- | --- |
| **TPS** | Output tokens per second; higher = faster decode. All runs use `max_tokens=2048`. |
| **TTFT** | Time to first token (ms): network round-trip + preprocessing + first token. Drives perceived responsiveness. |
| **P50 / P95 / P99** | Percentiles; the closer to the mean, the more consistent the model. |
| **Performance Map** | Top-left = low latency **and** high throughput = best. |

## Caveats

- TTFT and TPS are measured **from the CI runner’s network location** (GitHub-hosted runners live in the cloud), not from your end users. Read the numbers as *relative* comparisons under one consistent vantage point, not absolute SLAs. For location-accurate numbers, use a self-hosted runner.
- Token counts use the provider’s reported `usage` when present, otherwise a ~4-chars/token estimate.
- Third-party gateway routes can rate-limit or fail intermittently; failed runs are recorded (with the error) but excluded from the stats.

## Project structure

```
benchmark.js                    run benchmarks → data/results.ndjson  (env-only keys)
build.js                        NDJSON → dist/ (static site + data JSON)
lib/stats.js                    shared aggregation (percentiles, timeseries)
server.js                       zero-dep static server for local preview
stats.js                        CLI summary
public/index.html               the dashboard (Chart.js + vanilla JS)
wrangler.toml                   Cloudflare Pages project config
.github/workflows/benchmark.yml scheduled CI (benchmark → commit → build → deploy)
data/results.ndjson             append-only data (git as the database)
```

## Security

- API keys are read **only** from environment variables / CI secrets — there are no hardcoded defaults anywhere in the code.
- `.gitignore` excludes `.env`, `*.db`, and `dist/`.
- Only the built `dist/` is published to Pages; it contains aggregated metrics — no secrets, and no raw upstream error bodies (those are scrubbed before they’re stored and never appear in the published JSON).

## License

[MIT](LICENSE)
