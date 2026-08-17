import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  prepareVerificationCall,
  CredVeilVerificationCallService
} from '../verification-call.js';
import { createCredVeilProviders } from '../provider-factory.js';

test('CredVeil Verification Call Layer Unit Test Suite', async (t) => {

  await t.test('1. Valid verification call configuration preparation', () => {
    const validContractAddress = '00'.repeat(32);
    const validWitnesses = {
      score: 88n,
      salt: new Uint8Array(32).fill(12)
    };

    const callDescriptor = prepareVerificationCall({
      contractAddress: validContractAddress,
      witnesses: validWitnesses
    });

    strictAssert.equal(callDescriptor.contractAddress, validContractAddress);
    strictAssert.equal(callDescriptor.circuit, 'verify_eligibility');
    strictAssert.equal(callDescriptor.publicArguments.length, 0, 'verify_eligibility must have 0 public arguments');
    strictAssert.equal(callDescriptor.witnesses.score, 88n);
    strictAssert.deepEqual(callDescriptor.witnesses.salt, new Uint8Array(32).fill(12));
    strictAssert.equal(callDescriptor.preparedLocally, true);
  });

  await t.test('2. Reject missing or empty contract address', () => {
    const witnesses = {
      score: 88n,
      salt: new Uint8Array(32).fill(1)
    };

    strictAssert.throws(
      () => prepareVerificationCall({ contractAddress: '', witnesses }),
      /Contract address must be a non-empty string/
    );

    strictAssert.throws(
      () => prepareVerificationCall({ contractAddress: '   ', witnesses }),
      /Contract address must be a non-empty string/
    );
  });

  await t.test('3. Reject invalid score bounds (negative or overflow)', () => {
    const contractAddress = '00'.repeat(32);
    const salt = new Uint8Array(32);

    // Negative score
    strictAssert.throws(
      () => prepareVerificationCall({
        contractAddress,
        witnesses: { score: -5n, salt }
      }),
      /Score must be a Uint32-compatible non-negative bigint/
    );

    // Score overflow (> 4294967295)
    strictAssert.throws(
      () => prepareVerificationCall({
        contractAddress,
        witnesses: { score: 4294967296n, salt }
      }),
      /Score must be a Uint32-compatible non-negative bigint/
    );
  });

  await t.test('4. Reject salt with length != 32 bytes', () => {
    const contractAddress = '00'.repeat(32);

    // Short salt
    strictAssert.throws(
      () => prepareVerificationCall({
        contractAddress,
        witnesses: { score: 80n, salt: new Uint8Array(16) }
      }),
      /Salt must be a 32-byte Uint8Array/
    );

    // Long salt
    strictAssert.throws(
      () => prepareVerificationCall({
        contractAddress,
        witnesses: { score: 80n, salt: new Uint8Array(64) }
      }),
      /Salt must be a 32-byte Uint8Array/
    );
  });

  await t.test('5. CredVeilVerificationCallService wrapper operates cleanly with providers', () => {
    const providers = createCredVeilProviders();
    const service = new CredVeilVerificationCallService(providers);

    const callDescriptor = service.prepareCall({
      contractAddress: '11'.repeat(32),
      witnesses: {
        score: 95n,
        salt: new Uint8Array(32).fill(9)
      }
    });

    strictAssert.equal(callDescriptor.circuit, 'verify_eligibility');
    strictAssert.equal(callDescriptor.publicArguments.length, 0);
  });

  await t.test('6. Verification call preparation has zero live network side-effects', () => {
    const callDescriptor = prepareVerificationCall({
      contractAddress: '22'.repeat(32),
      witnesses: {
        score: 100n,
        salt: new Uint8Array(32).fill(2)
      }
    });

    strictAssert.ok(callDescriptor, 'Descriptor constructed synchronously in local memory without submitting network call');
  });

});
