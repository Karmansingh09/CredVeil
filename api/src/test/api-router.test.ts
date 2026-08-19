import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import { CredVeilApiRouter } from '../api-router.js';
import { ReadinessFetcher } from '../preprod-readiness.js';
import { createCredVeilProviders } from '../provider-factory.js';

test('CredVeil Midnight Preprod API Router Unit Test Suite', async (t) => {

  const healthyFetcher: ReadinessFetcher = async () => ({ ok: true, status: 200, statusText: 'OK' });
  const failingFetcher: ReadinessFetcher = async () => ({ ok: false, status: 500, statusText: 'Internal Server Error' });

  await t.test('1. GET /api/v1/preprod/readiness returns 200 and healthy readiness report', async () => {
    const router = new CredVeilApiRouter(undefined, healthyFetcher);

    const res = await router.handleReadinessRequest();

    strictAssert.equal(res.statusCode, 200);
    strictAssert.equal(res.success, true);
    strictAssert.ok(res.data);
    strictAssert.equal(res.data?.ready, true);
    strictAssert.equal(res.data?.mode, 'DRY_RUN');
  });

  await t.test('2. POST /api/v1/preprod/prepare-eligibility returns 200 with PREPARED_LOCALLY descriptor', async () => {
    const router = new CredVeilApiRouter();

    const res = await router.handlePrepareEligibilityRequest({
      contractAddress: '00'.repeat(32),
      score: 92,
      saltHex: '00'.repeat(32)
    });

    strictAssert.equal(res.statusCode, 200);
    strictAssert.equal(res.success, true);
    strictAssert.ok(res.data);
    strictAssert.equal(res.data?.lifecycleStage, 'PREPARED_LOCALLY');
    strictAssert.equal(res.data?.descriptor.circuit, 'verify_eligibility');
    strictAssert.equal(res.data?.descriptor.publicArguments.length, 0, 'Must have 0 public arguments');
  });

  await t.test('3. POST /api/v1/preprod/prepare-eligibility rejects malformed parameters with 400', async () => {
    const router = new CredVeilApiRouter();

    // Invalid score
    const res1 = await router.handlePrepareEligibilityRequest({
      contractAddress: '00'.repeat(32),
      score: 'invalid-number'
    });
    strictAssert.equal(res1.statusCode, 400);
    strictAssert.equal(res1.success, false);
    strictAssert.match(res1.error!, /score/);

    // Invalid saltHex length
    const res2 = await router.handlePrepareEligibilityRequest({
      contractAddress: '00'.repeat(32),
      score: 85,
      saltHex: '1234'
    });
    strictAssert.equal(res2.statusCode, 400);
    strictAssert.equal(res2.success, false);
    strictAssert.match(res2.error!, /saltHex/);
  });

  await t.test('4. POST /api/v1/preprod/orchestrate completes DRY_RUN orchestration cleanly', async () => {
    const router = new CredVeilApiRouter(undefined, healthyFetcher);

    const res = await router.handleOrchestrateRequest({
      verificationConfig: {
        contractAddress: '00'.repeat(32),
        score: 88,
        saltHex: '11'.repeat(32)
      }
    });

    strictAssert.equal(res.statusCode, 200);
    strictAssert.equal(res.success, true);
    strictAssert.ok(res.data);
    strictAssert.equal(res.data?.mode, 'DRY_RUN');
    strictAssert.equal(res.data?.executed, false);
  });

  await t.test('5. POST /api/v1/preprod/orchestrate handles LIVE mode offline SDK error truthfully', async () => {
    const baseProviders = createCredVeilProviders();
    const mockProviders = {
      ...baseProviders,
      walletProvider: {
        getCoinPublicKey: () => '00'.repeat(32),
        getEncryptionPublicKey: () => '00'.repeat(32)
      }
    };

    const router = new CredVeilApiRouter(mockProviders, healthyFetcher);

    const res = await router.handleOrchestrateRequest({
      config: { mode: 'LIVE', contractAddress: '00'.repeat(32) },
      verificationConfig: {
        contractAddress: '00'.repeat(32),
        score: 95
      }
    });

    strictAssert.equal(res.statusCode, 200);
    strictAssert.equal(res.success, false);
    strictAssert.ok(res.data);
    strictAssert.equal(res.data?.mode, 'LIVE');
    strictAssert.equal(res.data?.executed, false);
    strictAssert.equal(res.data?.execution?.status, 'FAILED');
    strictAssert.match(res.data?.message!, /Preprod live transaction failed/);
  });

  await t.test('6. POST /api/v1/preprod/orchestrate rejects LIVE mode when readiness fails', async () => {
    const router = new CredVeilApiRouter(undefined, failingFetcher);

    const res = await router.handleOrchestrateRequest({
      config: { mode: 'LIVE', contractAddress: '00'.repeat(32) },
      verificationConfig: {
        contractAddress: '00'.repeat(32),
        score: 90
      }
    });

    strictAssert.equal(res.statusCode, 400);
    strictAssert.equal(res.success, false);
    strictAssert.equal(res.data?.mode, 'LIVE');
    strictAssert.equal(res.data?.executed, false);
    strictAssert.match(res.data?.message!, /readiness check failed/);
  });

  await t.test('7. API router serializes responses safely without leaking private keys or secrets', async () => {
    const router = new CredVeilApiRouter();

    const res = await router.handlePrepareEligibilityRequest({
      contractAddress: '00'.repeat(32),
      score: 90
    });

    const serialized = JSON.stringify(res, (_key, val) => typeof val === 'bigint' ? val.toString() : val);
    strictAssert.equal(serialized.includes('privateKey'), false);
    strictAssert.equal(serialized.includes('seed'), false);
    strictAssert.equal(serialized.includes('mnemonic'), false);
  });

});
