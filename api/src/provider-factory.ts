/**
 * CredVeil Midnight Provider Composition Factory
 * 
 * Assembles individual Midnight.js provider instances into a composed provider set
 * for contract interaction and proof generation.
 * 
 * Lazy composition: No network I/O or connections are executed upon module import or factory creation.
 */

import {
  CredVeilNetworkConfig,
  DEFAULT_PREPROD_CONFIG,
  getNetworkConfig,
  createPublicDataProvider,
  createProofProvider,
  createPrivateStateProvider,
  createZkConfigProvider,
  CredVeilCircuitKeys,
  CredVeilPrivateStateKey
} from './providers.js';

import type { PublicDataProvider, ProofProvider, PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

export interface CredVeilCoreProviders {
  publicDataProvider: PublicDataProvider;
  proofProvider: ProofProvider;
  privateStateProvider: PrivateStateProvider<CredVeilPrivateStateKey>;
  zkConfigProvider: ReturnType<typeof createZkConfigProvider>;
}

/**
 * Lazy factory assembling the core Midnight.js providers required for CredVeil.
 * 
 * @param overrideConfig Optional endpoint overrides
 * @returns Composed CredVeil core providers container
 */
export function createCredVeilProviders(overrideConfig?: Partial<CredVeilNetworkConfig>): CredVeilCoreProviders {
  const config = getNetworkConfig(overrideConfig);

  const publicDataProvider = createPublicDataProvider(config);
  const zkConfigProvider = createZkConfigProvider(config);
  const proofProvider = createProofProvider(config);
  const privateStateProvider = createPrivateStateProvider(config);

  return {
    publicDataProvider,
    proofProvider,
    privateStateProvider,
    zkConfigProvider
  };
}
