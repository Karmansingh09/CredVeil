import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  isLaceAvailable,
  getLaceConnector,
  connectLaceWallet,
  getLaceConnectionStatus
} from '../lace-connector.js';

test('CredVeil Midnight Lace Wallet Connector Unit Test Suite', async (t) => {

  await t.test('1. Handles missing window or unavailable Lace gracefully', async () => {
    const emptyWindow = {};

    strictAssert.equal(isLaceAvailable(emptyWindow), false);
    strictAssert.equal(getLaceConnector(emptyWindow), null);

    const connRes = await connectLaceWallet('preprod', emptyWindow);
    strictAssert.equal(connRes.success, false);
    strictAssert.match(connRes.error!, /not installed or available/);

    const status = await getLaceConnectionStatus(emptyWindow);
    strictAssert.equal(status.isAvailable, false);
    strictAssert.equal(status.isConnected, false);
  });

  await t.test('2. Discovers Lace connector when window.midnight.mnLace exists', () => {
    const mockConnector = {
      rdns: 'mnLace',
      name: 'Lace Wallet',
      icon: 'data:image/svg+xml',
      apiVersion: '4.0.1',
      connect: async (networkId: string) => ({} as any)
    };

    const mockWindow = {
      midnight: {
        mnLace: mockConnector
      }
    };

    strictAssert.equal(isLaceAvailable(mockWindow), true);
    strictAssert.equal(getLaceConnector(mockWindow), mockConnector);
  });

  await t.test('3. Authorization connection flow using mocked connector', async () => {
    const mockConnectedAPI = {
      getShieldedBalances: async () => ({}),
      getUnshieldedBalances: async () => ({})
    };

    let connectCalledWithNetwork = '';
    const mockConnector = {
      rdns: 'mnLace',
      name: 'Lace Wallet',
      icon: 'data:image/svg+xml',
      apiVersion: '4.0.1',
      connect: async (networkId: string) => {
        connectCalledWithNetwork = networkId;
        return mockConnectedAPI as any;
      }
    };

    const mockWindow = {
      midnight: {
        mnLace: mockConnector
      }
    };

    const result = await connectLaceWallet('preprod', mockWindow);

    strictAssert.equal(result.success, true);
    strictAssert.equal(connectCalledWithNetwork, 'preprod');
    strictAssert.equal(result.walletAPI, mockConnectedAPI as any);
  });

  await t.test('4. Connection status query using mocked connector', async () => {
    const mockConnector = {
      rdns: 'mnLace',
      name: 'Lace Wallet',
      icon: 'data:image/svg+xml',
      apiVersion: '4.0.1',
      connect: async () => ({} as any)
    };

    const mockWindow = {
      midnight: {
        mnLace: mockConnector
      }
    };

    const status = await getLaceConnectionStatus(mockWindow);

    strictAssert.equal(status.isAvailable, true);
    strictAssert.equal(status.isConnected, true);
  });

  await t.test('5. Connector error handling during authorization failure', async () => {
    const mockConnector = {
      rdns: 'mnLace',
      name: 'Lace Wallet',
      icon: 'data:image/svg+xml',
      apiVersion: '4.0.1',
      connect: async () => {
        throw new Error('User rejected wallet authorization');
      }
    };

    const mockWindow = {
      midnight: {
        mnLace: mockConnector
      }
    };

    const result = await connectLaceWallet('preprod', mockWindow);

    strictAssert.equal(result.success, false);
    strictAssert.equal(result.error, 'User rejected wallet authorization');
  });

});
