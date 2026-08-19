import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  verifyPreprodReadiness,
  ReadinessFetcher
} from '../preprod-readiness.js';

test('CredVeil Midnight Preprod Infrastructure Readiness Unit Test Suite', async (t) => {

  await t.test('1. Valid DRY_RUN configuration with healthy endpoints reports ready = true', async () => {
    const mockFetcher: ReadinessFetcher = async (url) => {
      if (url.includes('indexer')) return { ok: true, status: 200, statusText: 'OK' };
      if (url.includes('6300')) return { ok: true, status: 200, statusText: 'OK' };
      return { ok: true, status: 200, statusText: 'OK' };
    };

    const report = await verifyPreprodReadiness({ mode: 'DRY_RUN' }, mockFetcher);

    strictAssert.equal(report.ready, true);
    strictAssert.equal(report.mode, 'DRY_RUN');
    strictAssert.equal(report.network, 'preprod');
    strictAssert.ok(report.checks.length >= 5);

    const contractCheck = report.checks.find((c) => c.name === 'contract_address');
    strictAssert.equal(contractCheck?.status, 'SKIPPED');
  });

  await t.test('2. Invalid endpoint configuration fails preflight validation immediately', async () => {
    const report = await verifyPreprodReadiness({ indexerUri: 'invalid-url-schema' });

    strictAssert.equal(report.ready, false);
    strictAssert.equal(report.checks[0].status, 'FAIL');
    strictAssert.match(report.checks[0].message, /invalid URL/);
  });

  await t.test('3. Missing contract address in LIVE mode sets ready = false', async () => {
    const mockFetcher: ReadinessFetcher = async () => ({ ok: true, status: 200, statusText: 'OK' });

    const report = await verifyPreprodReadiness({ mode: 'LIVE', contractAddress: undefined }, mockFetcher);

    strictAssert.equal(report.ready, false);
    strictAssert.equal(report.mode, 'LIVE');
    strictAssert.equal(report.checks[0].name, 'configuration_preflight');
    strictAssert.equal(report.checks[0].status, 'FAIL');
    strictAssert.match(report.checks[0].message, /Contract address is required/);
  });

  await t.test('4. Handles endpoint HTTP failures gracefully with status = FAIL', async () => {
    const mockFetcher: ReadinessFetcher = async (url) => {
      if (url.includes('6300')) return { ok: false, status: 500, statusText: 'Internal Server Error' };
      return { ok: true, status: 200, statusText: 'OK' };
    };

    const report = await verifyPreprodReadiness({ mode: 'DRY_RUN' }, mockFetcher);

    strictAssert.equal(report.ready, false);
    const proofCheck = report.checks.find((c) => c.name === 'proof_server');
    strictAssert.equal(proofCheck?.status, 'FAIL');
    strictAssert.match(proofCheck?.message!, /500/);
  });

  await t.test('5. Handles endpoint timeout error with status = FAIL and timeout message', async () => {
    const mockFetcher: ReadinessFetcher = async () => {
      const err = new Error('Request aborted due to timeout');
      err.name = 'AbortError';
      throw err;
    };

    const report = await verifyPreprodReadiness({ mode: 'DRY_RUN' }, mockFetcher);

    strictAssert.equal(report.ready, false);
    const indexerCheck = report.checks.find((c) => c.name === 'indexer_graphql');
    strictAssert.equal(indexerCheck?.status, 'FAIL');
    strictAssert.match(indexerCheck?.message!, /timed out/);
  });

  await t.test('6. Ensures no score, salt, private key, or seed fields exist in report', async () => {
    const mockFetcher: ReadinessFetcher = async () => ({ ok: true, status: 200, statusText: 'OK' });
    const report = await verifyPreprodReadiness({ mode: 'DRY_RUN' }, mockFetcher);

    const serialized = JSON.stringify(report);
    strictAssert.equal(serialized.includes('score'), false);
    strictAssert.equal(serialized.includes('salt'), false);
    strictAssert.equal(serialized.includes('privateKey'), false);
    strictAssert.equal(serialized.includes('seed'), false);
  });

  await t.test('7. LIVE mode reports ready = true when all endpoints and contract address PASS', async () => {
    const mockFetcher: ReadinessFetcher = async () => ({ ok: true, status: 200, statusText: 'OK' });

    const report = await verifyPreprodReadiness({
      mode: 'LIVE',
      contractAddress: '00'.repeat(32)
    }, mockFetcher);

    strictAssert.equal(report.ready, true);
    strictAssert.equal(report.mode, 'LIVE');
    const contractCheck = report.checks.find((c) => c.name === 'contract_address');
    strictAssert.equal(contractCheck?.status, 'PASS');
  });

});
