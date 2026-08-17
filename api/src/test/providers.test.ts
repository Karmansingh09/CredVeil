import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  DEFAULT_PREPROD_CONFIG,
  getNetworkConfig,
  createPublicDataProvider,
  createProofProvider,
  createPrivateStateProvider,
  createZkConfigProvider
} from '../providers.js';

test('CredVeil Midnight Network Provider Configuration Unit Test Suite', async (t) => {

  await t.test('1. Default Preprod endpoint configuration', () => {
    const config = getNetworkConfig();

    strictAssert.equal(config.indexerUri, 'https://indexer.preprod.midnight.network/api/v1/graphql');
    strictAssert.equal(config.indexerWsUri, 'wss://indexer.preprod.midnight.network/api/v1/graphql');
    strictAssert.equal(config.proofServerUri, 'http://localhost:6300');
    strictAssert.equal(config.nodeWsUri, 'wss://rpc.preprod.midnight.network');
    strictAssert.equal(config.privateStateStorePath, 'credveil-private-state');
  });

  await t.test('2. Custom endpoint configuration override', () => {
    const customConfig = getNetworkConfig({
      proofServerUri: 'http://custom-proof-server:6300',
      indexerUri: 'https://custom-indexer.midnight.network'
    });

    strictAssert.equal(customConfig.proofServerUri, 'http://custom-proof-server:6300');
    strictAssert.equal(customConfig.indexerUri, 'https://custom-indexer.midnight.network');
    strictAssert.equal(customConfig.nodeWsUri, DEFAULT_PREPROD_CONFIG.nodeWsUri);
  });

  await t.test('3. Provider factory instantiation without network side-effects', () => {
    const publicDataProvider = createPublicDataProvider();
    strictAssert.ok(publicDataProvider, 'Public data provider instance created');

    const proofProvider = createProofProvider();
    strictAssert.ok(proofProvider, 'Proof provider instance created');

    const privateStateProvider = createPrivateStateProvider();
    strictAssert.ok(privateStateProvider, 'Private state provider instance created');

    const zkConfigProvider = createZkConfigProvider();
    strictAssert.ok(zkConfigProvider, 'ZK config provider instance created');
  });

});
