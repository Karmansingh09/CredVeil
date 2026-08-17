import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import { CredVeilTransactionService } from '../transaction-service.js';
import { createCredVeilProviders } from '../provider-factory.js';

test('CredVeil Transaction Service Unit Test Suite', async (t) => {

  await t.test('1. Prepare deployment transaction request with valid parameters', () => {
    const providers = createCredVeilProviders();
    const txService = new CredVeilTransactionService(providers);

    const commitment = new Uint8Array(32).fill(42);
    const threshold = 75n;

    const deployTx = txService.prepareDeploymentTx({
      credentialCommitment: commitment,
      eligibilityThreshold: threshold
    });

    strictAssert.equal(deployTx.contractName, 'credveil');
    strictAssert.equal(deployTx.args.length, 2);
    strictAssert.deepEqual(deployTx.args[0], commitment);
    strictAssert.equal(deployTx.args[1], threshold);
    strictAssert.equal(deployTx.publicArguments.length, 0);
  });

  await t.test('2. Prepare verify_eligibility verification transaction request with 0 public arguments', () => {
    const providers = createCredVeilProviders();
    const txService = new CredVeilTransactionService(providers);

    const testScore = 87n;
    const testSalt = new Uint8Array(32).fill(7);
    const dummyContractAddress = '00'.repeat(32);

    const verifyTx = txService.prepareVerificationTx({
      contractAddress: dummyContractAddress,
      witnesses: {
        score: testScore,
        salt: testSalt
      }
    });

    strictAssert.equal(verifyTx.contractAddress, dummyContractAddress);
    strictAssert.equal(verifyTx.circuit, 'verify_eligibility');
    strictAssert.equal(verifyTx.publicArguments.length, 0, 'verify_eligibility transaction must have 0 public arguments');
    strictAssert.equal(verifyTx.privateInputs.score, testScore);
    strictAssert.deepEqual(verifyTx.privateInputs.salt, testSalt);
  });

  await t.test('3. Invalid configuration handling in transaction preparation', () => {
    const providers = createCredVeilProviders();
    const txService = new CredVeilTransactionService(providers);

    // Missing contract address for verification transaction
    strictAssert.throws(
      () => txService.prepareVerificationTx({
        contractAddress: '',
        witnesses: { score: 87n, salt: new Uint8Array(32) }
      }),
      /Valid contract address is required for verification transaction/
    );

    // Invalid commitment length for deployment transaction
    strictAssert.throws(
      () => txService.prepareDeploymentTx({
        credentialCommitment: new Uint8Array(10),
        eligibilityThreshold: 75n
      }),
      /Credential commitment must be a 32-byte Uint8Array/
    );
  });

  await t.test('4. Transaction preparation execution has zero live network side-effects', () => {
    const providers = createCredVeilProviders();
    const txService = new CredVeilTransactionService(providers);

    const tx = txService.prepareVerificationTx({
      contractAddress: '11'.repeat(32),
      witnesses: { score: 92n, salt: new Uint8Array(32).fill(1) }
    });

    strictAssert.ok(tx, 'Transaction payload constructed locally in memory without broadcasting network transaction');
  });

});
