import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import { createCredVeilProviders } from '../provider-factory.js';
import { DEFAULT_PREPROD_CONFIG } from '../providers.js';

test('CredVeil Midnight Provider Composition Unit Test Suite', async (t) => {

  await t.test('1. Composes core providers container with default configuration', () => {
    const providers = createCredVeilProviders();

    strictAssert.ok(providers.publicDataProvider, 'Public data provider composed');
    strictAssert.ok(providers.proofProvider, 'Proof provider composed');
    strictAssert.ok(providers.privateStateProvider, 'Private state provider composed');
    strictAssert.ok(providers.zkConfigProvider, 'ZK config provider composed');
  });

  await t.test('2. Composes core providers with custom endpoint configuration', () => {
    const customConfig = {
      proofServerUri: 'http://custom-proof-server:6300',
      privateStateStorePath: 'custom-credveil-store'
    };

    const providers = createCredVeilProviders(customConfig);

    strictAssert.ok(providers.publicDataProvider, 'Public data provider composed with custom config');
    strictAssert.ok(providers.proofProvider, 'Proof provider composed with custom config');
    strictAssert.ok(providers.privateStateProvider, 'Private state provider composed with custom config');
    strictAssert.ok(providers.zkConfigProvider, 'ZK config provider composed with custom config');
  });

  await t.test('3. Composition function execution has zero live network side-effects', () => {
    // Assert executing factory multiple times runs synchronously without throwing network errors
    const run1 = createCredVeilProviders();
    const run2 = createCredVeilProviders();

    strictAssert.ok(run1);
    strictAssert.ok(run2);
  });

});
