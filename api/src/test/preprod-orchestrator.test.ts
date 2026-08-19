import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import { CredVeilPreprodOrchestrator } from '../preprod-orchestrator.js';
import { ReadinessFetcher } from '../preprod-readiness.js';
import { createCredVeilProviders } from '../provider-factory.js';

test('CredVeil Midnight Preprod Orchestrator Unit Test Suite', async (t) => {

  const healthyFetcher: ReadinessFetcher = async () => ({ ok: true, status: 200, statusText: 'OK' });
  const failingFetcher: ReadinessFetcher = async () => ({ ok: false, status: 500, statusText: 'Internal Server Error' });

  await t.test('1. Default DRY_RUN mode completes orchestration cleanly without on-chain execution', async () => {
    const orchestrator = new CredVeilPreprodOrchestrator({}, undefined, healthyFetcher);

    const res = await orchestrator.orchestrateEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: { score: 95n, salt: new Uint8Array(32).fill(1) }
    });

    strictAssert.equal(res.mode, 'DRY_RUN');
    strictAssert.equal(res.executed, false);
    strictAssert.equal(res.readiness.ready, true);
    strictAssert.ok(res.preparedTx);
    strictAssert.equal(res.preparedTx?.lifecycleStage, 'PREPARED_LOCALLY');
    strictAssert.match(res.message, /DRY_RUN mode/);
  });

  await t.test('2. Halts orchestration if configuration is invalid', async () => {
    const orchestrator = new CredVeilPreprodOrchestrator({ indexerUri: 'invalid-url' }, undefined, healthyFetcher);

    const res = await orchestrator.orchestrateEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: { score: 85n, salt: new Uint8Array(32) }
    });

    strictAssert.equal(res.executed, false);
    strictAssert.match(res.message, /configuration error/i);
  });

  await t.test('3. Halts LIVE mode orchestration cleanly if readiness preflight fails without falling back to DRY_RUN', async () => {
    const orchestrator = new CredVeilPreprodOrchestrator(
      { mode: 'LIVE', contractAddress: '00'.repeat(32) },
      undefined,
      failingFetcher
    );

    const res = await orchestrator.orchestrateEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: { score: 90n, salt: new Uint8Array(32) }
    });

    strictAssert.equal(res.mode, 'LIVE');
    strictAssert.equal(res.executed, false);
    strictAssert.equal(res.readiness.ready, false);
    strictAssert.match(res.message, /Infrastructure readiness check failed/);
  });

  await t.test('4. Attempts LIVE execution when readiness passes, returning truthful SDK error in offline environment', async () => {
    const baseProviders = createCredVeilProviders();
    const mockProviders = {
      ...baseProviders,
      walletProvider: {
        getCoinPublicKey: () => '00'.repeat(32),
        getEncryptionPublicKey: () => '00'.repeat(32)
      }
    };

    const orchestrator = new CredVeilPreprodOrchestrator(
      { mode: 'LIVE', contractAddress: '00'.repeat(32) },
      mockProviders,
      healthyFetcher
    );

    const res = await orchestrator.orchestrateEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: { score: 92n, salt: new Uint8Array(32).fill(3) }
    });

    strictAssert.equal(res.mode, 'LIVE');
    strictAssert.equal(res.executed, false);
    strictAssert.equal(res.readiness.ready, true);
    strictAssert.ok(res.execution);
    strictAssert.equal(res.execution?.status, 'FAILED');
    strictAssert.match(res.message, /Preprod live transaction failed/);
  });

  await t.test('5. Asserts 0 public arguments and private witness preservation in preparedTx descriptor', async () => {
    const orchestrator = new CredVeilPreprodOrchestrator({}, undefined, healthyFetcher);

    const res = await orchestrator.orchestrateEligibilityVerification({
      contractAddress: '11'.repeat(32),
      witnesses: { score: 99n, salt: new Uint8Array(32).fill(7) }
    });

    strictAssert.equal(res.preparedTx?.descriptor.circuit, 'verify_eligibility');
    strictAssert.equal(res.preparedTx?.descriptor.publicArguments.length, 0, 'verify_eligibility must have 0 public arguments');
    strictAssert.equal(res.preparedTx?.descriptor.witnesses.score, 99n);
    strictAssert.deepEqual(res.preparedTx?.descriptor.witnesses.salt, new Uint8Array(32).fill(7));
  });

  await t.test('6. Ensures no score, salt, private key, or seed fields exist in orchestration output', async () => {
    const orchestrator = new CredVeilPreprodOrchestrator({}, undefined, healthyFetcher);

    const res = await orchestrator.orchestrateEligibilityVerification({
      contractAddress: '22'.repeat(32),
      witnesses: { score: 88n, salt: new Uint8Array(32).fill(2) }
    });

    const serialized = JSON.stringify(res, (_key, val) => typeof val === 'bigint' ? val.toString() : val);
    strictAssert.equal(serialized.includes('privateKey'), false);
    strictAssert.equal(serialized.includes('seed'), false);
    strictAssert.equal(serialized.includes('mnemonic'), false);
  });

});
