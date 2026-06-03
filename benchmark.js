import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseNdjson, computeStats } from './lib/stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const DATA_FILE = join(DATA_DIR, 'results.ndjson');

function getAuth(key) {
  try {
    const auth = JSON.parse(readFileSync(join(process.env.HOME || '/root', '.local/share/opencode/auth.json'), 'utf-8'));
    return auth[key]?.key;
  } catch { return null; }
}

// ===== 配置中心 =====
// 密钥只从环境变量 / 本地 opencode auth 读取，绝不硬编码（仓库私有也不例外）。
// 本地开发: 复制 .env.example 为 .env 后用 `npm run benchmark`（自动加载 .env）。
// CI: 由 Gitea Actions secrets 注入同名环境变量。
// URL 不是机密，保留公开默认值，可用环境变量覆盖。
const CFG = {
  OPENCODE_GO_KEY:  getAuth('opencode-go') || process.env.OPENCODE_GO_KEY || '',
  OPENCODE_GO_URL:  process.env.OPENCODE_GO_URL || 'https://opencode.ai/zen/go/v1',

  ZHIPU_KEY:        process.env.ZHIPU_API_KEY || '',
  ZHIPU_URL:        process.env.ZHIPU_URL || 'https://open.bigmodel.cn/api/coding/paas/v4',

  CHATGPT_FREE_KEY:      process.env.CHATGPT_FREE_KEY || '',
  CHATGPT_PLUS_FAST_KEY: process.env.CHATGPT_PLUS_FAST_KEY || '',
  CHATGPT_PLUS_KEY:      process.env.CHATGPT_PLUS_KEY || '',
  CHATGPT_PRO_KEY:       process.env.CHATGPT_PRO_KEY || '',
  CHATGPT_URL:           process.env.CHATGPT_URL || 'https://api.zygtoken.com/v1',

  DEEPSEEK_KEY:     process.env.DEEPSEEK_API_KEY || '',
  DEEPSEEK_URL:     process.env.DEEPSEEK_URL || 'https://api.deepseek.com',

  MINIMAX_KEY:      process.env.MINIMAX_API_KEY || '',
  MINIMAX_URL:      process.env.MINIMAX_URL || 'https://api.minimaxi.com/v1',

  GEMINI_KEY:       process.env.GEMINI_API_KEY || '',
  GEMINI_URL:       process.env.GEMINI_URL || 'https://api.zygtoken.com/v1',

  CLAUDE_AWS_KEY:   process.env.CLAUDE_AWS_API_KEY || '',
  CLAUDE_AWS_URL:   process.env.CLAUDE_AWS_URL || 'https://api.zygtoken.com/v1',

  CLAUDE_WS_KEY:    process.env.CLAUDE_WS_API_KEY || '',
  CLAUDE_WS_URL:    process.env.CLAUDE_WS_URL || 'https://api.zygtoken.com/v1',

  CLAUDE_MAX_KEY:   process.env.CLAUDE_MAX_API_KEY || '',
  CLAUDE_MAX_URL:   process.env.CLAUDE_MAX_URL || 'https://api.zygtoken.com/v1',
};

const PROVIDERS = [
  {
    name: 'OpenCode Go',
    apiBase: CFG.OPENCODE_GO_URL,
    apiKey: CFG.OPENCODE_GO_KEY,
    apiType: 'openai',
    models: [
      { id: 'glm-5.1', name: 'GLM-5.1' },
      { id: 'glm-5', name: 'GLM-5' },
      { id: 'kimi-k2.6', name: 'Kimi K2.6' },
      { id: 'kimi-k2.5', name: 'Kimi K2.5' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
      { id: 'mimo-v2.5', name: 'MiMo V2.5' },
      { id: 'mimo-v2.5-pro', name: 'MiMo V2.5 Pro' },
    ],
  },
  {
    name: 'OpenCode Go',
    apiBase: CFG.OPENCODE_GO_URL,
    apiKey: CFG.OPENCODE_GO_KEY,
    apiType: 'anthropic',
    models: [
      { id: 'minimax-m2.7', name: 'MiniMax M2.7' },
      { id: 'minimax-m2.5', name: 'MiniMax M2.5' },
    ],
  },
  {
    name: 'Zhipu AI',
    apiBase: CFG.ZHIPU_URL,
    apiKey: CFG.ZHIPU_KEY,
    apiType: 'openai',
    models: [
      { id: 'glm-5.1', name: 'GLM-5.1' },
      { id: 'glm-5', name: 'GLM-5' },
      { id: 'glm-5-turbo', name: 'GLM-5-Turbo' },
    ],
  },
  {
    name: 'ChatGPT Plus Fast',
    apiBase: CFG.CHATGPT_URL,
    apiKey: CFG.CHATGPT_PLUS_FAST_KEY,
    apiType: 'openai',
    serviceTier: 'fast',
    models: [
      { id: 'gpt-5.5', name: 'GPT-5.5' },
      { id: 'gpt-5.4', name: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4-Mini' },
    ],
  },
  {
    name: 'ChatGPT Free',
    apiBase: CFG.CHATGPT_URL,
    apiKey: CFG.CHATGPT_FREE_KEY,
    apiType: 'openai',
    models: [
      { id: 'gpt-5.5', name: 'GPT-5.5' },
      { id: 'gpt-5.4', name: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4-Mini' },
    ],
  },
  {
    name: 'ChatGPT Plus',
    apiBase: CFG.CHATGPT_URL,
    apiKey: CFG.CHATGPT_PLUS_KEY,
    apiType: 'openai',
    models: [
      { id: 'gpt-5.5', name: 'GPT-5.5' },
      { id: 'gpt-5.4', name: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4-Mini' },
    ],
  },
  {
    name: 'ChatGPT Pro',
    apiBase: CFG.CHATGPT_URL,
    apiKey: CFG.CHATGPT_PRO_KEY,
    apiType: 'openai',
    models: [
      { id: 'gpt-5.5', name: 'GPT-5.5' },
      { id: 'gpt-5.4', name: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', name: 'GPT-5.4-Mini' },
    ],
  },
  {
    name: 'DeepSeek Official',
    apiBase: CFG.DEEPSEEK_URL,
    apiKey: CFG.DEEPSEEK_KEY,
    apiType: 'openai',
    models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
    ],
  },
  {
    name: 'MiniMax Official',
    apiBase: CFG.MINIMAX_URL,
    apiKey: CFG.MINIMAX_KEY,
    apiType: 'openai',
    models: [
      { id: 'MiniMax-M3', name: 'MiniMax M3' },
      { id: 'MiniMax-M2.7', name: 'MiniMax M2.7' },
      { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax M2.7 HS' },
      { id: 'MiniMax-M2.5', name: 'MiniMax M2.5' },
      { id: 'MiniMax-M2.5-highspeed', name: 'MiniMax M2.5 HS' },
      { id: 'MiniMax-M2.1', name: 'MiniMax M2.1' },
    ],
  },
  {
    name: 'Gemini',
    apiBase: CFG.GEMINI_URL,
    apiKey: CFG.GEMINI_KEY,
    apiType: 'openai',
    models: [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
      { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
    ],
  },
  {
    name: 'Claude AWS',
    apiBase: CFG.CLAUDE_AWS_URL,
    apiKey: CFG.CLAUDE_AWS_KEY,
    apiType: 'openai',
    models: [
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ],
  },
  {
    name: 'Claude Windsurf',
    apiBase: CFG.CLAUDE_WS_URL,
    apiKey: CFG.CLAUDE_WS_KEY,
    apiType: 'openai',
    models: [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ],
  },
  {
    name: 'Claude Code Max',
    apiBase: CFG.CLAUDE_MAX_URL,
    apiKey: CFG.CLAUDE_MAX_KEY,
    apiType: 'openai',
    models: [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
      { id: 'claude-opus-4-7-thinking', name: 'Claude Opus 4.7 Thinking' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
      { id: 'cursor-opus-4-7', name: 'Cursor Opus 4.7' },
      { id: 'cursor-opus-4-6', name: 'Cursor Opus 4.6' },
      { id: 'cursor-sonnet-4-6', name: 'Cursor Sonnet 4.6' },
      { id: 'cursor-haiku-4-5', name: 'Cursor Haiku 4.5' },
    ],
  },
].filter(p => p.apiKey);

if (PROVIDERS.length === 0) {
  console.error('No API keys found. Set them in .env (local) or CI secrets. See .env.example.');
  process.exit(1);
}

// ~4 chars per token for English text/code
function countTokens(text) {
  if (!text || text.length === 0) return 0;
  return Math.max(1, Math.round(text.length / 4));
}

// All models run the SAME fixed task: write a blog post
// This ensures consistent output across all models
const PROMPTS = [
  {
    type: 'writing',
    content: 'Write a detailed technical blog post about the architecture and implementation of a real-time collaborative code editor. Cover: 1) Operational Transformation vs CRDT for conflict resolution, 2) WebSocket connection management and reconnection strategies, 3) How to handle cursor synchronization across multiple users, 4) Performance considerations for large documents. Write at least 800 words with concrete code examples in JavaScript.',
    inputTokens: countTokens('Write a detailed technical blog post about the architecture and implementation of a real-time collaborative code editor. Cover: 1) Operational Transformation vs CRDT for conflict resolution, 2) WebSocket connection management and reconnection strategies, 3) How to handle cursor synchronization across multiple users, 4) Performance considerations for large documents. Write at least 800 words with concrete code examples in JavaScript.'),
  },
];

const TIMEOUT_MS = 180000; // 3 min for longer writing task
const CONCURRENCY = 6; // max parallel tests
// Hard cap on generated output. Throughput (TPS) only needs enough tokens to
// measure steady-state speed; 512 is plenty and keeps spend bounded.
const MAX_OUTPUT_TOKENS = 512;
// Cap accumulated history so the committed NDJSON stays bounded. 0 = keep all.
// Robust against misconfiguration: unset/empty/non-numeric all fall back to 30.
const RETENTION_DAYS = (() => {
  const raw = process.env.RETENTION_DAYS;
  if (raw === undefined || raw === '') return 30;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 30;
})();
// Skip a model if it was successfully measured within this window. Keep this
// SHORTER than the cron interval (currently every 6h) so each scheduled run
// still re-measures everything, while push/manual reruns within the window
// reuse recent results instead of burning quota.
const RECENT_WINDOW_MS = 5 * 60 * 60 * 1000;

// "YYYY-MM-DD HH:MM:SS" in UTC — matches the legacy SQLite datetime('now') format
// so existing front-end date parsing keeps working unchanged.
function sqlNow(date = new Date()) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function loadRecords() {
  if (!existsSync(DATA_FILE)) return [];
  return parseNdjson(readFileSync(DATA_FILE, 'utf-8'));
}

// Atomic write: serialize to a temp file in the same dir, then rename over the
// target (rename is atomic on POSIX). A crash/ENOSPC mid-write can never corrupt
// the single source of truth — the old file stays intact until the rename.
function saveRecords(records) {
  const body = records.map(r => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');
  const tmp = DATA_FILE + '.tmp';
  writeFileSync(tmp, body);
  renameSync(tmp, DATA_FILE);
}

async function streamAll(modelId, prompt, apiBase, apiKey, apiType, signal, opts = {}) {
  const isAnthropic = apiType === 'anthropic';

  const startTime = performance.now();
  let firstTokenTime = null;
  let allText = '';
  let actualOutputTokens = 0;
  let actualInputTokens = 0;

  let url, body, headers;
  if (isAnthropic) {
    url = `${apiBase}/messages`;
    body = JSON.stringify({ model: modelId, max_tokens: MAX_OUTPUT_TOKENS, messages: [{ role: 'user', content: prompt }], stream: true });
    headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
  } else {
    url = `${apiBase}/chat/completions`;
    // Send both: legacy `max_tokens` for older/direct endpoints, and
    // `max_completion_tokens` for OpenAI reasoning models (GPT-5.x, Gemini-3
    // compat, …) which silently ignore `max_tokens`. Relays accept whichever
    // they understand; sending both caps every backend.
    body = JSON.stringify({ model: modelId, messages: [{ role: 'user', content: prompt }], max_tokens: MAX_OUTPUT_TOKENS, max_completion_tokens: MAX_OUTPUT_TOKENS, temperature: 0.7, stream: true, ...(opts.serviceTier ? { service_tier: opts.serviceTier } : {}) });
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
  }

  const resp = await fetch(url, { method: 'POST', headers, body, signal });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${err.slice(0, 200)}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data: ')) continue;
      const d = t.slice(6);
      if (d === '[DONE]') continue;

      try {
        const parsed = JSON.parse(d);

        if (isAnthropic) {
          if (parsed.type === 'message_delta' && parsed.usage) {
            actualOutputTokens = parsed.usage.output_tokens || actualOutputTokens;
            actualInputTokens = parsed.usage.input_tokens || actualInputTokens;
          }
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text || parsed.delta?.thinking || '';
            if (text) {
              if (firstTokenTime === null) firstTokenTime = performance.now();
              allText += text;
            }
          }
          if (parsed.type === 'content_block_start') {
            const block = parsed.content_block || {};
            const text = block.text || block.thinking || '';
            if (text) {
              if (firstTokenTime === null) firstTokenTime = performance.now();
              allText += text;
            }
          }
        } else {
          if (parsed.usage) {
            actualOutputTokens = parsed.usage.completion_tokens || actualOutputTokens;
            actualInputTokens = parsed.usage.prompt_tokens || actualInputTokens;
          }
          const choice = parsed.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta || {};
          const text = delta.content || delta.reasoning_content || delta.text || choice.message?.content || '';
          if (text) {
            if (firstTokenTime === null) firstTokenTime = performance.now();
            allText += text;
          }
        }
      } catch { /* skip */ }
    }
  }

  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;
  const ttftMs = firstTokenTime !== null ? firstTokenTime - startTime : totalTimeMs;

  const outputTokens = actualOutputTokens || countTokens(allText);
  const inputTokens = actualInputTokens || countTokens(prompt);
  const tps = outputTokens > 0 && totalTimeMs > 0 ? (outputTokens / (totalTimeMs / 1000)) : 0;

  return { ttftMs, totalTimeMs, inputTokens, outputTokens, totalConsumed: inputTokens + outputTokens, tps };
}

function log(msg) { process.stdout.write(msg + '\n'); }

const round2 = (n) => Math.round(n * 100) / 100;

// Strip anything resembling a credential before persisting an upstream error body
// (some gateways echo the submitted key/header back in error JSON).
function sanitizeError(s) {
  if (!s) return s;
  return s
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, 'sk-***')
    .replace(/Bearer\s+\S+/gi, 'Bearer ***')
    .replace(/(["']?(?:api[_-]?key|authorization|x-api-key|token)["']?\s*[:=]\s*["']?)[^"',}\s]+/gi, '$1***');
}

async function runBenchmark() {
  log(`\n=== OpenCode Go Benchmark — ${new Date().toISOString()} ===\n`);
  log(`Fixed task: Technical blog post (~${PROMPTS[0].inputTokens} input tokens, target 800+ words)`);
  log(`Models: ${PROVIDERS.reduce((s, p) => s + p.models.length, 0)} total, concurrency: ${CONCURRENCY}\n`);

  const existing = loadRecords();

  // Build flat task list, skipping models tested successfully within the recent window.
  const cutoff = sqlNow(new Date(Date.now() - RECENT_WINDOW_MS));
  const recentMap = {};
  for (const r of existing) {
    if (r.success === 1 && r.run_at >= cutoff) recentMap[r.provider + '/' + r.model_id] = true;
  }

  const tasks = [];
  let skipped = 0;
  for (const prompt of PROMPTS) {
    for (const provider of PROVIDERS) {
      for (const model of provider.models) {
        if (recentMap[provider.name + '/' + model.id]) { skipped++; continue; }
        tasks.push({ prompt, provider, model });
      }
    }
  }

  log(`${'='.repeat(60)}`);
  log(`Prompt: writing (${PROMPTS[0].inputTokens} input tok)`);
  if (skipped > 0) log(`Skipped ${skipped} models (tested within 1 hour)`);
  log(`${'='.repeat(60)}\n`);

  const newRecords = [];
  let completed = 0;
  const total = tasks.length;

  async function worker(task) {
    const { prompt, provider, model } = task;
    const label = `${provider.name} ${model.name}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const result = await streamAll(model.id, prompt.content, provider.apiBase, provider.apiKey, provider.apiType, controller.signal, { serviceTier: provider.serviceTier });

      const record = {
        provider: provider.name, model_id: model.id, model_name: model.name,
        run_at: sqlNow(), prompt_type: prompt.type,
        input_tokens: result.inputTokens, output_tokens: result.outputTokens,
        total_tokens: result.totalConsumed,
        time_to_first_token_ms: round2(result.ttftMs),
        total_time_ms: round2(result.totalTimeMs),
        tokens_per_second: round2(result.tps),
        duration_ms: round2(result.totalTimeMs),
        success: 1, error: null,
      };
      return { record, label, tps: result.tps, ttft: result.ttftMs, tok: result.outputTokens, totalTime: result.totalTimeMs };
    } catch (err) {
      const msg = err.name === 'AbortError' ? 'TIMEOUT' : (sanitizeError(err.message)?.slice(0, 120) || 'UNKNOWN');
      const record = {
        provider: provider.name, model_id: model.id, model_name: model.name,
        run_at: sqlNow(), prompt_type: prompt.type,
        input_tokens: prompt.inputTokens, output_tokens: 0, total_tokens: prompt.inputTokens,
        time_to_first_token_ms: 0, total_time_ms: 0, tokens_per_second: 0, duration_ms: 0,
        success: 0, error: msg,
      };
      return { record, label, error: true, msg };
    } finally {
      clearTimeout(timer);
    }
  }

  const running = new Set();
  for (const task of tasks) {
    while (running.size >= CONCURRENCY) await Promise.race(running);
    const p = worker(task).then(res => {
      running.delete(p);
      newRecords.push(res.record);
      completed++;
      const bar = res.error
        ? `FAIL  ${res.msg}`
        : `TPS: ${res.tps.toFixed(1).padStart(5)}  tok:${res.tok}  TTFT:${res.ttft.toFixed(0)}ms  total:${(res.totalTime / 1000).toFixed(1)}s`;
      log(`  [${completed}/${total}] ${res.label.padEnd(28)} ${bar}`);
    });
    running.add(p);
  }
  await Promise.allSettled(running);

  // Persist: existing + new, pruned to the retention window, in chronological order.
  let all = existing.concat(newRecords);
  if (RETENTION_DAYS > 0) {
    const keepFrom = sqlNow(new Date(Date.now() - RETENTION_DAYS * 86400000));
    const before = all.length;
    all = all.filter(r => r.run_at >= keepFrom);
    if (all.length < before) log(`\nPruned ${before - all.length} records older than ${RETENTION_DAYS}d`);
  }
  saveRecords(all);

  // Summary (sorted by mean TPS) — reuse the shared aggregation.
  log(`\n${'='.repeat(60)}`);
  log('Summary (sorted by mean TPS)');
  log(`${'='.repeat(60)}\n`);

  const stats = computeStats(all).sort((a, b) => (b.stats.tps.mean || 0) - (a.stats.tps.mean || 0));
  for (const s of stats) {
    const t = s.stats.tps;
    log(`[${s.provider}] ${s.model_name.padEnd(18)}  mean:${t.mean.toFixed(1).padStart(6)}  p50:${t.p50.toFixed(1).padStart(6)}  p95:${t.p95.toFixed(1).padStart(6)}  p99:${t.p99.toFixed(1).padStart(6)}  |  TTFT:${s.stats.ttft.mean.toFixed(0).padStart(5)}ms`);
  }

  log(`\nDone. ${newRecords.length} new records, ${all.length} total in ${DATA_FILE.replace(__dirname + '/', '')}`);
}

const start = Date.now();
runBenchmark().catch(console.error).finally(() => {
  console.log(`\nTotal time: ${((Date.now() - start) / 1000 / 60).toFixed(1)} min`);
});
