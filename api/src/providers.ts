/**
 * CredVeil Midnight Network Providers Configuration
 * 
 * Defines standard MidnightProviders container types and Preprod network endpoint defaults.
 */

import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';

export type CredVeilProviders = MidnightProviders<
  'verify_eligibility'
>;

export interface CredVeilNetworkConfig {
  indexerUri: string;
  indexerWsUri: string;
  proofServerUri: string;
  nodeWsUri: string;
}

export const DEFAULT_PREPROD_CONFIG: CredVeilNetworkConfig = {
  indexerUri: process.env.INDEXER_URI || 'https://indexer.preprod.midnight.network',
  indexerWsUri: process.env.INDEXER_WS_URI || 'wss://indexer.preprod.midnight.network/api/v1/graphql',
  proofServerUri: process.env.PROOF_SERVER_URI || 'http://localhost:6300',
  nodeWsUri: process.env.NODE_URI || 'wss://rpc.preprod.midnight.network'
};

export function getNetworkConfig(overrideConfig?: Partial<CredVeilNetworkConfig>): CredVeilNetworkConfig {
  return {
    ...DEFAULT_PREPROD_CONFIG,
    ...overrideConfig
  };
}
