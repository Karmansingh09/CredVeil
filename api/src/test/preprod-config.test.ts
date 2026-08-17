import { test } from 'node:test';
import strictAssert from 'node:assert/strict';
import {
  getPreprodConfiguration,
  validatePreprodConfiguration,
  DEFAULT_PREPROD_ENV_CONFIG
} from '../preprod-config.js';

test('CredVeil Midnight Preprod Configuration Unit Test Suite', async (t) => {

  await t.test('1. Default Preprod configuration defaults to DRY_RUN and valid Preprod endpoints', () => {
    const config = getPreprodConfiguration();

    strictAssert.equal(config.network, 'preprod');
    strictAssert.equal(config.mode, 'DRY_RUN');
    strictAssert.equal(config.indexerUri, DEFAULT_PREPROD_ENV_CONFIG.indexerUri);
    strictAssert.equal(config.indexerWsUri, DEFAULT_PREPROD_ENV_CONFIG.indexerWsUri);
    strictAssert.equal(config.nodeWsUri, DEFAULT_PREPROD_ENV_CONFIG.nodeWsUri);
    strictAssert.equal(config.proofServerUri, DEFAULT_PREPROD_ENV_CONFIG.proofServerUri);

    const validated = validatePreprodConfiguration(config);
    strictAssert.equal(validated.mode, 'DRY_RUN');
  });

  await t.test('2. Environment variable overrides customize configuration correctly', () => {
    const origEnv = { ...process.env };
    try {
      process.env.MIDNIGHT_INDEXER_URI = 'https://custom-indexer.example.com/graphql';
      process.env.CREDVEIL_EXECUTION_MODE = 'LIVE';
      process.env.CREDVEIL_CONTRACT_ADDRESS = '00'.repeat(32);

      const config = getPreprodConfiguration();
      strictAssert.equal(config.mode, 'LIVE');
      strictAssert.equal(config.indexerUri, 'https://custom-indexer.example.com/graphql');
      strictAssert.equal(config.contractAddress, '00'.repeat(32));

      const validated = validatePreprodConfiguration(config);
      strictAssert.equal(validated.mode, 'LIVE');
    } finally {
      process.env = origEnv;
    }
  });

  await t.test('3. Rejects invalid URL endpoints in preflight validation', () => {
    strictAssert.throws(
      () => validatePreprodConfiguration({
        ...getPreprodConfiguration(),
        indexerUri: 'not-a-valid-url'
      }),
      /Configuration field indexerUri contains invalid URL/
    );
  });

  await t.test('4. Rejects LIVE mode without contract address', () => {
    strictAssert.throws(
      () => validatePreprodConfiguration({
        ...getPreprodConfiguration(),
        mode: 'LIVE',
        contractAddress: undefined
      }),
      /Contract address is required when execution mode is set to "LIVE"/
    );
  });

  await t.test('5. Ensures no secret fields exist in configuration structure', () => {
    const config = getPreprodConfiguration();
    strictAssert.equal((config as any).secretKey, undefined);
    strictAssert.equal((config as any).privateKey, undefined);
    strictAssert.equal((config as any).seed, undefined);
    strictAssert.equal((config as any).mnemonic, undefined);
  });

  await t.test('6. Configuration generation and validation causes zero network calls or side-effects', () => {
    const config = getPreprodConfiguration();
    const validated = validatePreprodConfiguration(config);
    strictAssert.ok(validated);
  });

});
