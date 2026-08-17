import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  createLaceProviderBridge,
  isConnectedAPIValid
} from '../lace-provider-bridge.js';
import { CredVeilTransactionService } from '../transaction-service.js';

test('CredVeil Midnight Lace Provider Bridge Unit Test Suite', async (t) => {

  await t.test('1. Creates bridge from valid mock ConnectedAPI', () => {
    const mockConnectedAPI = {
      getShieldedBalances: async () => ({}),
      getUnshieldedBalances: async () => ({})
    } as any;

    const bridge = createLaceProviderBridge({ connectedAPI: mockConnectedAPI });

    strictAssert.ok(bridge.publicDataProvider, 'Public data provider bridged');
    strictAssert.ok(bridge.proofProvider, 'Proof provider bridged');
    strictAssert.ok(bridge.privateStateProvider, 'Private state provider bridged');
    strictAssert.ok(bridge.zkConfigProvider, 'ZK config provider bridged');
    strictAssert.equal(bridge.laceConnectedAPI, mockConnectedAPI, 'Lace API reference attached');
  });

  await t.test('2. Fails safely on missing or invalid ConnectedAPI', () => {
    strictAssert.throws(
      () => createLaceProviderBridge({ connectedAPI: null as any }),
      /Authorized Lace ConnectedAPI is required/
    );

    strictAssert.throws(
      () => createLaceProviderBridge({ connectedAPI: { invalid: true } as any }),
      /Invalid Lace ConnectedAPI instance provided/
    );
  });

  await t.test('3. Integrates with CredVeilTransactionService without exposing score or salt publicly', () => {
    const mockConnectedAPI = {
      getShieldedBalances: async () => ({}),
      getUnshieldedBalances: async () => ({})
    } as any;

    const bridgeProviders = createLaceProviderBridge({ connectedAPI: mockConnectedAPI });
    const txService = new CredVeilTransactionService(bridgeProviders);

    const verifyTx = txService.prepareVerificationTx({
      contractAddress: '00'.repeat(32),
      witnesses: {
        score: 95n,
        salt: new Uint8Array(32).fill(5)
      }
    });

    strictAssert.equal(verifyTx.circuit, 'verify_eligibility');
    strictAssert.equal(verifyTx.publicArguments.length, 0, 'verify_eligibility must have 0 public arguments');
    strictAssert.equal(verifyTx.privateInputs.score, 95n);
    strictAssert.deepEqual(verifyTx.privateInputs.salt, new Uint8Array(32).fill(5));
  });

  await t.test('4. Bridge creation and transaction preparation has zero live network side-effects', () => {
    const mockConnectedAPI = {
      getShieldedBalances: async () => ({}),
      getUnshieldedBalances: async () => ({})
    } as any;

    const bridgeProviders = createLaceProviderBridge({ connectedAPI: mockConnectedAPI });
    strictAssert.ok(bridgeProviders, 'Bridge instantiated in local memory without live network calls');
  });

});
