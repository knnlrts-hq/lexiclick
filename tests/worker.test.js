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
