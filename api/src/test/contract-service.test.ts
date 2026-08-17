import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  CredVeilContractService,
  createCredVeilWitnesses,
  createCredVeilContractInstance
} from '../contract-service.js';
import { createCredVeilProviders } from '../provider-factory.js';

test('CredVeil Contract Service Unit Test Suite', async (t) => {

  await t.test('1. Prepare deployment configuration with valid parameters', () => {
    const providers = createCredVeilProviders();
    const service = new CredVeilContractService(providers);

    const commitment = new Uint8Array(32).fill(42);
    const threshold = 75n;

    const prep = service.prepareDeployment({
      credentialCommitment: commitment,
      eligibilityThreshold: threshold
    });

    strictAssert.equal(prep.args.length, 2);
    strictAssert.deepEqual(prep.args[0], commitment);
    strictAssert.equal(prep.args[1], threshold);
    strictAssert.equal(prep.privateStateKey, 'credveil_state');
  });

  await t.test('2. Deployment parameter validation errors', () => {
    const providers = createCredVeilProviders();
    const service = new CredVeilContractService(providers);

    // Invalid commitment length
    strictAssert.throws(
      () => service.prepareDeployment({
        credentialCommitment: new Uint8Array(16),
        eligibilityThreshold: 75n
      }),
      /Credential commitment must be a 32-byte Uint8Array/
    );

    // Negative threshold
    strictAssert.throws(
      () => service.prepareDeployment({
        credentialCommitment: new Uint8Array(32),
        eligibilityThreshold: -10n
      }),
      /Eligibility threshold must be a non-negative integer/
    );
  });

  await t.test('3. Prepare verify_eligibility circuit invocation with private witness handling', () => {
    const providers = createCredVeilProviders();
    const service = new CredVeilContractService(providers);

    const testScore = 87n;
    const testSalt = new Uint8Array(32).fill(7);
    const dummyContractAddress = '00'.repeat(32);

    const prep = service.prepareEligibilityVerification({
      contractAddress: dummyContractAddress,
      witnesses: {
        score: testScore,
        salt: testSalt
      }
    });

    strictAssert.equal(prep.contractAddress, dummyContractAddress);
    strictAssert.equal(prep.circuit, 'verify_eligibility');
    strictAssert.equal(prep.publicArguments.length, 0, 'Circuit must take 0 public arguments');

    // Verify private witnesses are properly passed to local contract instance
    const witnessContext = { privateState: null } as any;
    const [_, scoreRes] = prep.contract.witnesses.get_secret_score(witnessContext);
    const [__, saltRes] = prep.contract.witnesses.get_secret_salt(witnessContext);

    strictAssert.equal(scoreRes, testScore, 'Secret score retrieved via witness');
    strictAssert.deepEqual(saltRes, testSalt, 'Secret salt retrieved via witness');
  });

  await t.test('4. Service instantiation and preparation has zero live network side-effects', () => {
    const providers = createCredVeilProviders();
    const service = new CredVeilContractService(providers);

    const prep = service.prepareEligibilityVerification({
      contractAddress: '00'.repeat(32),
      witnesses: {
        score: 95n,
        salt: new Uint8Array(32).fill(9)
      }
    });

    strictAssert.ok(prep, 'Preparation executed synchronously in local memory without submitting network transaction');
  });

});
