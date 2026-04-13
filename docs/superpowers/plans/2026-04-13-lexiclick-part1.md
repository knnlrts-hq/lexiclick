# Lexiclick Implementation Plan — Part 1: Foundation & Worker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This plan has 3 parts:**
> - **Part 1 (this file):** Foundation + Cloudflare Worker (Tasks 1–2)
> - **Part 2:** Core Logic — Tokenization & Normalization (Tasks 3–4)
> - **Part 3:** Frontend UI & Polish (Tasks 5–8)

**Goal:** Build a foreign-language reader app where pasted French/German text becomes clickable — each word opens a modal with Tatoeba example sentences and a Wiktionary dictionary page.

**Architecture:** Single `index.html` served from GitHub Pages (no build step, no framework). A ~30-line Cloudflare Worker (`worker/worker.js`) proxies Tatoeba API requests to add CORS headers. Wiktionary loads directly in an iframe (CORS allowed).

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Workers, Node.js 22 built-in test runner (`node --test`)

**Design Spec:** `docs/superpowers/specs/2026-04-13-lexiclick-design.md` — read this first for full context.

---

## File Map

| File | Responsibility | Created in |
|------|---------------|------------|
| `package.json` | ESM config + `npm test` script | Task 1 |
| `tests/setup.js` | Extracts testable functions from `index.html` via `vm` | Task 1 |
| `index.html` | The entire frontend app (inline JS + CSS) | Task 1 (stub), Tasks 3–8 (built up) |
| `tests/worker.test.js` | Cloudflare Worker unit tests | Task 2 |
| `worker/worker.js` | Tatoeba API proxy (Cloudflare Worker) | Task 2 |
| `worker/wrangler.toml` | Worker deployment config | Task 2 |
| `tests/tokenize.test.js` | Tokenization unit tests | Task 3 |
| `tests/normalize.test.js` | Normalization + URL builder unit tests | Task 4 |

---

## Testing Strategy

The frontend is a **single HTML file with inline JS** — no modules, no build step. Here's how we test the pure logic without changing the architecture:

### Pure logic (tokenize, normalize, URL builders)

The functions live inside a `<script>` block in `index.html`, bracketed by `// === CORE LOGIC ===` markers. A test helper (`tests/setup.js`) reads `index.html`, extracts the code between those markers, and evaluates it using `new Function()`. Tests run against the **actual shipped code** — no duplication.

### Cloudflare Worker

The worker is a standalone ES module (`worker/worker.js`). Tests import it directly. Node 22 provides global `Request`/`Response` APIs, so no polyfills needed. Tests mock `globalThis.fetch` to avoid hitting the real Tatoeba API.

### UI and integration

Tested **manually in the browser**. Open `index.html` as a file (no dev server needed). Each UI task includes specific things to verify.

### Commands

```bash
npm test                              # all tests
node --test tests/tokenize.test.js    # one file
```

---

## Task 1: Project Scaffolding & Test Infrastructure

**Files:**
- Create: `package.json`
- Create: `tests/setup.js`
- Modify: `index.html` (create with function stubs)

This task creates the project skeleton and test infrastructure. After this task, `npm test` runs (and passes trivially).

- [ ] **Step 1: Create `package.json`**

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

Why `"type": "module"`: the Cloudflare Worker uses `export default`, which is ES module syntax. This tells Node to treat all `.js` files as ESM so we can `import` the worker in tests.

- [ ] **Step 2: Create `tests/setup.js`**

This helper extracts the pure logic functions from `index.html` so tests can call them directly in Node.

```js
import { readFileSync } from 'node:fs';

export function loadCoreFunctions() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const match = html.match(/\/\/ === CORE LOGIC ===\n([\s\S]*?)\/\/ === END CORE LOGIC ===/);
  if (!match) throw new Error('Could not find CORE LOGIC block in index.html');

  const exports = [
    'LANGS', 'TATOEBA_PROXY',
    'tokenize', 'normalize', 'wiktionaryUrl', 'tatoebaProxyUrl',
  ];
  const returnExpr = exports
    .map(name => `${name}: typeof ${name} !== 'undefined' ? ${name} : undefined`)
    .join(', ');

  const fn = new Function(match[1] + `\nreturn { ${returnExpr} };`);
  return fn();
}
```

How it works:
1. Reads `index.html` as a string
2. Regex extracts the code between `// === CORE LOGIC ===` and `// === END CORE LOGIC ===`
3. Wraps it in a `new Function(...)` with a `return` statement that collects all exports
4. The `typeof` guard means missing functions return `undefined` (gives clear test failures instead of crashes)

- [ ] **Step 3: Create `index.html` with function stubs**

This is the minimal version — just enough for the test infrastructure to work. It will be expanded in later tasks.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lexiclick</title>
</head>
<body>
  <script>
  // === CORE LOGIC ===
  function tokenize() {}
  function normalize() {}
  function wiktionaryUrl() {}
  function tatoebaProxyUrl() {}
  // === END CORE LOGIC ===
  </script>
</body>
</html>
```

- [ ] **Step 4: Verify test infrastructure works**

Run: `npm test`

Expected: All tests pass (there are no test files yet, so Node reports 0 tests). The important thing is no errors — Node finds the `tests/` directory and `setup.js` parses cleanly.

Also verify the setup helper works:

```bash
node -e "import('./tests/setup.js').then(m => console.log(Object.keys(m.loadCoreFunctions())))"
```

Expected output: `[ 'LANGS', 'TATOEBA_PROXY', 'tokenize', 'normalize', 'wiktionaryUrl', 'tatoebaProxyUrl' ]`

- [ ] **Step 5: Commit**

```bash
git add package.json tests/setup.js index.html
git commit -m "chore: project scaffolding and test infrastructure"
```

---

## Task 2: TDD the Cloudflare Worker

**Files:**
- Create: `tests/worker.test.js`
- Create: `worker/worker.js`
- Create: `worker/wrangler.toml`

The worker is a transparent proxy: receive a request from the frontend, forward it to `api.tatoeba.org`, return the response with CORS headers. That's it.

- [ ] **Step 1: Create stub `worker/worker.js`**

The tests need something to import. Start with an empty handler:

```js
export default {
  async fetch(request) {
    return new Response('not implemented', { status: 501 });
  },
};
```

- [ ] **Step 2: Write tests in `tests/worker.test.js`**

```js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/worker.js';

describe('worker', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns 404 for unknown paths', async () => {
    const req = new Request('https://worker.dev/unknown');
    const res = await worker.fetch(req);
    assert.equal(res.status, 404);
  });

  it('returns 400 when q param is missing', async () => {
    const req = new Request('https://worker.dev/tatoeba?from=fra&to=eng');
    const res = await worker.fetch(req);
    assert.equal(res.status, 400);
  });

  it('returns 400 when from param is missing', async () => {
    const req = new Request('https://worker.dev/tatoeba?q=bonjour&to=eng');
    const res = await worker.fetch(req);
    assert.equal(res.status, 400);
  });

  it('returns 400 when to param is missing', async () => {
    const req = new Request('https://worker.dev/tatoeba?q=bonjour&from=fra');
    const res = await worker.fetch(req);
    assert.equal(res.status, 400);
  });

  it('proxies valid request to tatoeba API', async () => {
    const mockBody = JSON.stringify({ results: [{ text: 'Bonjour!' }] });
    globalThis.fetch = async (url) => {
      assert.ok(url.includes('api.tatoeba.org/v1/sentences'));
      assert.ok(url.includes('q=bonjour'));
      assert.ok(url.includes('lang=fra'));
      assert.ok(url.includes('trans_lang=eng'));
      assert.ok(url.includes('limit=5'));
      return new Response(mockBody, { status: 200 });
    };

    const req = new Request('https://worker.dev/tatoeba?q=bonjour&from=fra&to=eng');
    const res = await worker.fetch(req);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=86400');

    const data = await res.json();
    assert.equal(data.results[0].text, 'Bonjour!');
  });

  it('handles CORS preflight (OPTIONS)', async () => {
    const req = new Request('https://worker.dev/tatoeba', { method: 'OPTIONS' });
    const res = await worker.fetch(req);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'GET');
  });

  it('forwards upstream error status', async () => {
    globalThis.fetch = async () => new Response('error', { status: 500 });

    const req = new Request('https://worker.dev/tatoeba?q=xyz&from=fra&to=eng');
    const res = await worker.fetch(req);
    assert.equal(res.status, 500);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});
```

**What each test verifies:**
- `404 for unknown paths` — only `/tatoeba` is a valid endpoint
- `400 when param missing` (×3) — all three query params (`q`, `from`, `to`) are required
- `proxies valid request` — the main path: forwards to Tatoeba, returns response with CORS + cache headers
- `CORS preflight` — browsers send OPTIONS before cross-origin requests; worker must respond
- `forwards upstream error` — if Tatoeba returns 500, we pass it through (still with CORS headers)

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test tests/worker.test.js`

Expected: Most tests FAIL (the stub returns 501 for everything). This confirms the tests are actually checking behavior.

- [ ] **Step 4: Implement `worker/worker.js`**

Replace the stub with the real implementation:

```js
export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/tatoeba') {
      return new Response('Not found', { status: 404 });
    }

    const q = url.searchParams.get('q');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!q || !from || !to) {
      return new Response('Missing required parameters: q, from, to', { status: 400 });
    }

    const tatoebaUrl =
      'https://api.tatoeba.org/v1/sentences' +
      '?lang=' + encodeURIComponent(from) +
      '&q=' + encodeURIComponent(q) +
      '&trans_lang=' + encodeURIComponent(to) +
      '&limit=5';

    const resp = await fetch(tatoebaUrl);
    const body = await resp.text();

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/worker.test.js`

Expected: All 7 tests PASS.

- [ ] **Step 6: Create `worker/wrangler.toml`**

```toml
name = "lexiclick-tatoeba"
main = "worker.js"
compatibility_date = "2024-01-01"
```

This is the config for `npx wrangler deploy`. You don't need to deploy now — just have the file ready.

- [ ] **Step 7: Commit**

```bash
git add tests/worker.test.js worker/worker.js worker/wrangler.toml
git commit -m "feat: add Cloudflare Worker for Tatoeba API proxy (TDD)"
```

**Deployment note (not part of this plan):** When you're ready to deploy, run `cd worker && npx wrangler deploy`. You'll get a URL like `https://lexiclick-tatoeba.YOUR-ACCOUNT.workers.dev`. Update `TATOEBA_PROXY` in `index.html` with that URL.

---

**End of Part 1.** Continue with Part 2: `docs/superpowers/plans/2026-04-13-lexiclick-part2.md`
