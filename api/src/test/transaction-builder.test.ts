import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  buildEligibilityTransaction,
  CredVeilTransactionBuilder
} from '../transaction-builder.js';
import { createCredVeilProviders } from '../provider-factory.js';

test('CredVeil Midnight Transaction Builder Unit Test Suite', async (t) => {

  await t.test('1. Prepares valid verify_eligibility transaction descriptor with PREPARED_LOCALLY stage', () => {
    const validContractAddress = '00'.repeat(32);
    const validWitnesses = {
      score: 92n,
      salt: new Uint8Array(32).fill(15)
    };

    const tx = buildEligibilityTransaction({
      contractAddress: validContractAddress,
      witnesses: validWitnesses
    });

    strictAssert.equal(tx.lifecycleStage, 'PREPARED_LOCALLY');
    strictAssert.equal(tx.descriptor.circuit, 'verify_eligibility');
    strictAssert.equal(tx.descriptor.publicArguments.length, 0, 'Must have 0 public arguments');
    strictAssert.equal(tx.descriptor.witnesses.score, 92n);
    strictAssert.deepEqual(tx.descriptor.witnesses.salt, new Uint8Array(32).fill(15));
    strictAssert.ok(tx.preparedAt, 'Timestamp attached');
  });

  await t.test('2. Rejects invalid parameters (missing contract address, invalid score, invalid salt)', () => {
    const validWitnesses = { score: 85n, salt: new Uint8Array(32) };

    // Missing contract address
    strictAssert.throws(
      () => buildEligibilityTransaction({ contractAddress: '', witnesses: validWitnesses }),
      /Contract address must be a non-empty string/
    );

    // Invalid score
    strictAssert.throws(
      () => buildEligibilityTransaction({ contractAddress: '00'.repeat(32), witnesses: { score: -1n, salt: new Uint8Array(32) } }),
      /Score must be a Uint32-compatible non-negative bigint/
    );

    // Invalid salt length
    strictAssert.throws(
      () => buildEligibilityTransaction({ contractAddress: '00'.repeat(32), witnesses: { score: 85n, salt: new Uint8Array(10) } }),
      /Salt must be a 32-byte Uint8Array/
    );
  });

  await t.test('3. CredVeilTransactionBuilder service integrates with providers cleanly', () => {
    const providers = createCredVeilProviders();
    const builder = new CredVeilTransactionBuilder(providers);

    const tx = builder.prepareEligibilityTx({
      contractAddress: '11'.repeat(32),
      witnesses: { score: 88n, salt: new Uint8Array(32).fill(8) }
    });

    strictAssert.equal(tx.lifecycleStage, 'PREPARED_LOCALLY');
    strictAssert.equal(tx.descriptor.contractAddress, '11'.repeat(32));
    strictAssert.equal(tx.descriptor.publicArguments.length, 0);
  });

  await t.test('4. Preparation causes zero live network calls and does not fake proof generation or transaction hashes', () => {
    const tx = buildEligibilityTransaction({
      contractAddress: '33'.repeat(32),
      witnesses: { score: 77n, salt: new Uint8Array(32).fill(3) }
    });

    strictAssert.equal(tx.lifecycleStage, 'PREPARED_LOCALLY');
    strictAssert.equal((tx as any).txHash, undefined, 'No fake transaction hash is attached');
    strictAssert.notEqual(tx.lifecycleStage, 'PROOF_GENERATED', 'Proof generation is not faked');
    strictAssert.notEqual(tx.lifecycleStage, 'TRANSACTION_SUBMITTED', 'Transaction submission is not faked');
  });

});
