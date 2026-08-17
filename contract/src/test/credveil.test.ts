import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  Contract,
  ledger
} from '../managed/credveil/contract/index.js';
import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

// Helper to compute the exact persistentHash([score, salt]) using the contract's tuple descriptor
function computeTestCommitment(score: bigint, salt: Uint8Array): Uint8Array {
  const bytesDesc = new __compactRuntime.CompactTypeBytes(32);
  const uintDesc = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

  const tupleDescriptor = {
    alignment() {
      return uintDesc.alignment().concat(bytesDesc.alignment());
    },
    fromValue(value: any) {
      return [uintDesc.fromValue(value), bytesDesc.fromValue(value)];
    },
    toValue(value: [bigint, Uint8Array]) {
      return uintDesc.toValue(value[0]).concat(bytesDesc.toValue(value[1]));
    }
  };

  return __compactRuntime.persistentHash(tupleDescriptor, [score, salt]);
}

test('CredVeil Compact Contract Unit Test Suite', async (t) => {

  await t.test('1. VALID ELIGIBILITY — Valid score and salt increments verification_count', () => {
    const testScore = 87n;
    const testThreshold = 75n;
    const testSalt = new Uint8Array(32).fill(7);

    // Compute expected SHA-256 commitment off-chain using exact persistentHash descriptor
    const expectedCommitment = computeTestCommitment(testScore, testSalt);

    // Instantiate Contract with private witness handlers
    const contract = new Contract({
      get_secret_score: (context: any) => [context.privateState, testScore],
      get_secret_salt: (context: any) => [context.privateState, testSalt]
    });

    // 1. Run constructor initialization
    const initContext = __compactRuntime.createConstructorContext(
      null as any,
      __compactRuntime.sampleSigningKey()
    );
    const initResult = contract.initialState(initContext, expectedCommitment, testThreshold);
    const initialLedger = ledger(initResult.currentContractState.data);

    strictAssert.equal(initialLedger.verification_count, 0n, 'Initial verification_count must be 0');
    strictAssert.equal(initialLedger.eligibility_threshold, testThreshold, 'Initial threshold must match deployment input');
    strictAssert.deepEqual(initialLedger.credential_commitment, expectedCommitment, 'Initial commitment must match deployment input');

    // 2. Execute verify_eligibility circuit
    const circuitContext = __compactRuntime.createCircuitContext(
      __compactRuntime.dummyContractAddress(),
      initContext.initialZswapLocalState.coinPublicKey,
      initResult.currentContractState.data,
      null
    );
    const circuitResult = contract.impureCircuits.verify_eligibility(circuitContext);
    const updatedLedger = ledger(circuitResult.context.currentQueryContext.state);

    // 3. Assert state changes
    strictAssert.equal(updatedLedger.verification_count, 1n, 'verification_count must increment to 1');
    strictAssert.equal(updatedLedger.eligibility_threshold, testThreshold, 'eligibility_threshold must remain unchanged');
    strictAssert.deepEqual(updatedLedger.credential_commitment, expectedCommitment, 'credential_commitment must remain unchanged');
  });

  await t.test('2. INVALID SALT — Wrong salt fails commitment assertion without mutating ledger', () => {
    const testScore = 87n;
    const testThreshold = 75n;
    const correctSalt = new Uint8Array(32).fill(7);
    const wrongSalt = new Uint8Array(32).fill(99);

    const expectedCommitment = computeTestCommitment(testScore, correctSalt);

    // Contract instance with witness returning wrong salt
    const contract = new Contract({
      get_secret_score: (context: any) => [context.privateState, testScore],
      get_secret_salt: (context: any) => [context.privateState, wrongSalt]
    });

    const initContext = __compactRuntime.createConstructorContext(
      null as any,
      __compactRuntime.sampleSigningKey()
    );
    const initResult = contract.initialState(initContext, expectedCommitment, testThreshold);

    const circuitContext = __compactRuntime.createCircuitContext(
      __compactRuntime.dummyContractAddress(),
      initContext.initialZswapLocalState.coinPublicKey,
      initResult.currentContractState.data,
      null
    );

    // Assert circuit fails with commitment mismatch error
    strictAssert.throws(
      () => contract.impureCircuits.verify_eligibility(circuitContext),
      (err: Error) => {
        strictAssert.match(err.message, /Invalid credential commitment/);
        return true;
      },
      'Execution must throw "Invalid credential commitment" assertion error'
    );

    // Assert verification_count remains 0
    const currentLedger = ledger(initResult.currentContractState.data);
    strictAssert.equal(currentLedger.verification_count, 0n, 'verification_count must remain 0 on failure');
  });

  await t.test('3. SCORE BELOW THRESHOLD — Score under threshold fails assertion without mutating ledger', () => {
    const lowScore = 60n; // Ineligible score (60 < 75)
    const testThreshold = 75n;
    const testSalt = new Uint8Array(32).fill(7);

    const lowScoreCommitment = computeTestCommitment(lowScore, testSalt);

    // Contract instance with witness returning low score 60
    const contract = new Contract({
      get_secret_score: (context: any) => [context.privateState, lowScore],
      get_secret_salt: (context: any) => [context.privateState, testSalt]
    });

    const initContext = __compactRuntime.createConstructorContext(
      null as any,
      __compactRuntime.sampleSigningKey()
    );
    const initResult = contract.initialState(initContext, lowScoreCommitment, testThreshold);

    const circuitContext = __compactRuntime.createCircuitContext(
      __compactRuntime.dummyContractAddress(),
      initContext.initialZswapLocalState.coinPublicKey,
      initResult.currentContractState.data,
      null
    );

    // Assert circuit fails with threshold assertion error
    strictAssert.throws(
      () => contract.impureCircuits.verify_eligibility(circuitContext),
      (err: Error) => {
        strictAssert.match(err.message, /Score below required threshold/);
        return true;
      },
      'Execution must throw "Score below required threshold" assertion error'
    );

    // Assert verification_count remains 0
    const currentLedger = ledger(initResult.currentContractState.data);
    strictAssert.equal(currentLedger.verification_count, 0n, 'verification_count must remain 0 on failure');
  });

});
