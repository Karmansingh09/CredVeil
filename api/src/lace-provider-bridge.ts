/**
 * CredVeil Midnight Lace Wallet Provider Bridge
 * 
 * Bridges an authorized Midnight Lace ConnectedAPI instance into the CredVeil
 * provider architecture for wallet-backed transaction signing and state querying.
 */

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { CredVeilCoreProviders, createCredVeilProviders } from './provider-factory.js';
import { CredVeilNetworkConfig } from './providers.js';

export interface LaceBridgeOptions {
  connectedAPI: ConnectedAPI;
  baseConfig?: Partial<CredVeilNetworkConfig>;
}

export interface CredVeilLaceProviders extends CredVeilCoreProviders {
  laceConnectedAPI: ConnectedAPI;
}

/**
 * Validates that an authorized Lace ConnectedAPI instance exposes expected API methods.
 */
export function isConnectedAPIValid(api: any): api is ConnectedAPI {
  if (!api || typeof api !== 'object') {
    return false;
  }
  return (
    typeof api.getShieldedBalances === 'function' &&
    typeof api.getUnshieldedBalances === 'function'
  );
}

/**
 * Bridges an authorized Lace ConnectedAPI into the CredVeil provider architecture.
 * 
 * @param options Lace wallet API connection options
 * @returns Composed provider set incorporating the Lace wallet interface
 */
export function createLaceProviderBridge(options: LaceBridgeOptions): CredVeilLaceProviders {
  if (!options.connectedAPI) {
    throw new Error('Authorized Lace ConnectedAPI is required to create provider bridge');
  }

  if (!isConnectedAPIValid(options.connectedAPI)) {
    throw new Error('Invalid Lace ConnectedAPI instance provided');
  }

  // Create base providers with optional endpoint overrides
  const baseProviders = createCredVeilProviders(options.baseConfig);

  return {
    ...baseProviders,
    laceConnectedAPI: options.connectedAPI
  };
}
