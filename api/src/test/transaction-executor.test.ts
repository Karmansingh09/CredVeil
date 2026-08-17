import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import { CredVeilTransactionExecutor } from '../transaction-executor.js';
import { createCredVeilProviders } from '../provider-factory.js';

test('CredVeil Midnight Transaction Executor Unit Test Suite', async (t) => {

  await t.test('1. Fails safely when providers instance is missing', async () => {
    const executor = new CredVeilTransactionExecutor();

    const res = await executor.executeEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: { score: 85n, salt: new Uint8Array(32).fill(1) }
    });

    strictAssert.equal(res.success, false);
    strictAssert.equal(res.status, 'FAILED');
    strictAssert.match(res.error!, /Required Midnight providers instance not supplied/);
  });

  await t.test('2. Fails safely when local transaction preparation fails due to invalid parameters', async () => {
    const providers = createCredVeilProviders();
    const executor = new CredVeilTransactionExecutor(providers);

    // Invalid score (-10n)
    const res = await executor.executeEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: { score: -10n, salt: new Uint8Array(32) }
    });

    strictAssert.equal(res.success, false);
    strictAssert.equal(res.status, 'FAILED');
    strictAssert.match(res.error!, /Local transaction preparation failed/);
  });

  await t.test('3. Fails safely when walletProvider is missing from execution providers', async () => {
    const providers = createCredVeilProviders();
    const executor = new CredVeilTransactionExecutor(providers);

    const res = await executor.executeEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: { score: 90n, salt: new Uint8Array(32).fill(5) }
    });

    strictAssert.equal(res.success, false);
    strictAssert.equal(res.status, 'FAILED');
    strictAssert.match(res.error!, /Required walletProvider is missing/);
    strictAssert.equal(res.txHash, undefined, 'No fake transaction hash is generated');
  });

  await t.test('4. Catches real Midnight.js SDK error when executing createUnprovenCallTx offline with mock walletProvider', async () => {
    const baseProviders = createCredVeilProviders();
    const mockProviders = {
      ...baseProviders,
      walletProvider: {
        getCoinPublicKey: () => '00'.repeat(32),
        getEncryptionPublicKey: () => '00'.repeat(32)
      }
    };

    const executor = new CredVeilTransactionExecutor(mockProviders);

    const res = await executor.executeEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: { score: 90n, salt: new Uint8Array(32).fill(5) }
    });

    strictAssert.equal(res.success, false);
    strictAssert.equal(res.status, 'FAILED');
    strictAssert.match(res.error!, /Midnight.js SDK execution error/);
    strictAssert.equal(res.txHash, undefined, 'No fake transaction hash is generated on SDK error');
  });

  await t.test('5. Asserts 0 public arguments and private witness preservation in preparedTx descriptor', async () => {
    const baseProviders = createCredVeilProviders();
    const mockProviders = {
      ...baseProviders,
      walletProvider: {
        getCoinPublicKey: () => '00'.repeat(32),
        getEncryptionPublicKey: () => '00'.repeat(32)
      }
    };

    const executor = new CredVeilTransactionExecutor(mockProviders);

    const res = await executor.executeEligibilityVerification({
      contractAddress: '11'.repeat(32),
      witnesses: { score: 99n, salt: new Uint8Array(32).fill(9) }
    });

    strictAssert.equal(res.preparedTx.descriptor.circuit, 'verify_eligibility');
    strictAssert.equal(res.preparedTx.descriptor.publicArguments.length, 0, 'verify_eligibility must have 0 public arguments');
    strictAssert.equal(res.preparedTx.descriptor.witnesses.score, 99n);
    strictAssert.deepEqual(res.preparedTx.descriptor.witnesses.salt, new Uint8Array(32).fill(9));
  });

});
