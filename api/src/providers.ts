/**
 * CredVeil Midnight Network Providers Configuration Foundation
 * 
 * Configures the Midnight network providers for:
 * - Public Data / Indexer Provider (GraphQL chain queries)
 * - Proof Provider (HTTP ZK proof generation server)
 * - Private State Provider (Local LevelDB encrypted witness storage)
 * - ZK Config Provider (Circuit keys and ZKIR artifact loading)
 * 
 * Provides lazy factory functions that do NOT execute live connections on import.
 */

import type { MidnightProviders, ProofProvider, PublicDataProvider, PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';

export type CredVeilCircuitKeys = 'verify_eligibility';
export type CredVeilPrivateStateKey = string;

export type CredVeilProviders = MidnightProviders<
  CredVeilCircuitKeys,
  CredVeilPrivateStateKey
>;

export interface CredVeilNetworkConfig {
  indexerUri: string;
  indexerWsUri: string;
  proofServerUri: string;
  nodeWsUri: string;
  privateStateStorePath: string;
  zkConfigPath: string;
}

export const DEFAULT_PREPROD_CONFIG: CredVeilNetworkConfig = {
  indexerUri: process.env.INDEXER_URI || 'https://indexer.preprod.midnight.network/api/v1/graphql',
  indexerWsUri: process.env.INDEXER_WS_URI || 'wss://indexer.preprod.midnight.network/api/v1/graphql',
  proofServerUri: process.env.PROOF_SERVER_URI || 'http://localhost:6300',
  nodeWsUri: process.env.NODE_URI || 'wss://rpc.preprod.midnight.network',
  privateStateStorePath: process.env.PRIVATE_STATE_STORE_PATH || 'credveil-private-state',
  zkConfigPath: process.env.ZK_CONFIG_PATH || 'http://localhost:3000/managed/credveil'
};

export function getNetworkConfig(overrideConfig?: Partial<CredVeilNetworkConfig>): CredVeilNetworkConfig {
  return {
    ...DEFAULT_PREPROD_CONFIG,
    ...overrideConfig
  };
}

/**
 * Creates an Indexer Public Data Provider instance.
 */
export function createPublicDataProvider(config: CredVeilNetworkConfig = DEFAULT_PREPROD_CONFIG): PublicDataProvider {
  return indexerPublicDataProvider(config.indexerUri, config.indexerWsUri);
}

/**
 * Creates a ZK Config Artifact Provider instance.
 */
export function createZkConfigProvider(config: CredVeilNetworkConfig = DEFAULT_PREPROD_CONFIG) {
  return new FetchZkConfigProvider<CredVeilCircuitKeys>(config.zkConfigPath, fetch);
}

/**
 * Creates an HTTP Client Proof Provider instance.
 */
export function createProofProvider(config: CredVeilNetworkConfig = DEFAULT_PREPROD_CONFIG): ProofProvider {
  return httpClientProofProvider(config.proofServerUri, createZkConfigProvider(config));
}

/**
 * Creates a LevelDB Local Private State Provider instance.
 */
export function createPrivateStateProvider(config: CredVeilNetworkConfig = DEFAULT_PREPROD_CONFIG): PrivateStateProvider<CredVeilPrivateStateKey> {
  return levelPrivateStateProvider<CredVeilPrivateStateKey>({
    accountId: config.privateStateStorePath,
    privateStoragePasswordProvider: () => Promise.resolve(process.env.PRIVATE_STATE_PASSWORD || 'credveil-default-password')
  });
}
