import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import { createCredVeilHttpServer } from '../server.js';
import { ReadinessFetcher } from '../preprod-readiness.js';
import { createCredVeilProviders } from '../provider-factory.js';
import { AddressInfo } from 'node:net';

test('CredVeil Midnight Preprod HTTP Server Unit Test Suite', async (t) => {

  const healthyFetcher: ReadinessFetcher = async () => ({ ok: true, status: 200, statusText: 'OK' });
  const failingFetcher: ReadinessFetcher = async () => ({ ok: false, status: 500, statusText: 'Internal Server Error' });

  let server: any;
  let baseUrl: string;

  t.before(async () => {
    server = createCredVeilHttpServer({ fetcher: healthyFetcher });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  t.after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  await t.test('1. GET /health returns 200 and healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    strictAssert.equal(res.status, 200);
    const body = await res.json();
    strictAssert.equal(body.success, true);
    strictAssert.equal(body.data.status, 'HEALTHY');
  });

  await t.test('2. OPTIONS /api/v1/preprod/readiness returns 204 with CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/v1/preprod/readiness`, { method: 'OPTIONS' });
    strictAssert.equal(res.status, 204);
    strictAssert.equal(res.headers.get('access-control-allow-origin'), '*');
  });

  await t.test('3. GET /api/v1/preprod/readiness returns 200 readiness report', async () => {
    const res = await fetch(`${baseUrl}/api/v1/preprod/readiness`);
    strictAssert.equal(res.status, 200);
    const body = await res.json();
    strictAssert.equal(body.success, true);
    strictAssert.equal(body.data.ready, true);
    strictAssert.equal(body.data.mode, 'DRY_RUN');
  });

  await t.test('4. POST /api/v1/preprod/prepare-eligibility returns 200 with PREPARED_LOCALLY stage', async () => {
    const res = await fetch(`${baseUrl}/api/v1/preprod/prepare-eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress: '00'.repeat(32),
        score: 95,
        saltHex: '00'.repeat(32)
      })
    });

    strictAssert.equal(res.status, 200);
    const body = await res.json();
    strictAssert.equal(body.success, true);
    strictAssert.equal(body.data.lifecycleStage, 'PREPARED_LOCALLY');
    strictAssert.equal(body.data.descriptor.circuit, 'verify_eligibility');
    strictAssert.equal(body.data.descriptor.publicArguments.length, 0, 'Must have 0 public arguments');
  });

  await t.test('5. POST /api/v1/preprod/prepare-eligibility returns 400 on malformed JSON or parameters', async () => {
    const res = await fetch(`${baseUrl}/api/v1/preprod/prepare-eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed_json: '
    });

    strictAssert.equal(res.status, 400);
    const body = await res.json();
    strictAssert.equal(body.success, false);
    strictAssert.match(body.error, /Invalid JSON payload/);
  });

  await t.test('6. POST /api/v1/preprod/orchestrate returns 200 for DRY_RUN mode', async () => {
    const res = await fetch(`${baseUrl}/api/v1/preprod/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationConfig: {
          contractAddress: '00'.repeat(32),
          score: 88,
          saltHex: '11'.repeat(32)
        }
      })
    });

    strictAssert.equal(res.status, 200);
    const body = await res.json();
    strictAssert.equal(body.success, true);
    strictAssert.equal(body.data.mode, 'DRY_RUN');
    strictAssert.equal(body.data.executed, false);
  });

  await t.test('7. POST /api/v1/preprod/orchestrate returns 400 for LIVE mode when readiness fails', async () => {
    const failingServer = createCredVeilHttpServer({ fetcher: failingFetcher });
    let failingUrl: string = '';

    await new Promise<void>((resolve) => {
      failingServer.listen(0, '127.0.0.1', () => {
        const address = failingServer.address() as AddressInfo;
        failingUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    try {
      const res = await fetch(`${failingUrl}/api/v1/preprod/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { mode: 'LIVE', contractAddress: '00'.repeat(32) },
          verificationConfig: {
            contractAddress: '00'.repeat(32),
            score: 90
          }
        })
      });

      strictAssert.equal(res.status, 400);
      const body = await res.json();
      strictAssert.equal(body.success, false);
      strictAssert.equal(body.data.mode, 'LIVE');
      strictAssert.equal(body.data.executed, false);
    } finally {
      await new Promise<void>((resolve) => failingServer.close(() => resolve()));
    }
  });

  await t.test('8. GET /unknown-route returns 404', async () => {
    const res = await fetch(`${baseUrl}/unknown-route`);
    strictAssert.equal(res.status, 404);
    const body = await res.json();
    strictAssert.equal(body.success, false);
    strictAssert.match(body.error, /not found/);
  });

  await t.test('9. HTTP responses preserve privacy and leak no secrets or private keys', async () => {
    const res = await fetch(`${baseUrl}/api/v1/preprod/prepare-eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractAddress: '00'.repeat(32),
        score: 90
      })
    });

    const text = await res.text();
    strictAssert.equal(text.includes('privateKey'), false);
    strictAssert.equal(text.includes('seed'), false);
    strictAssert.equal(text.includes('mnemonic'), false);
  });

});
