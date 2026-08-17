/**
 * CredVeil Midnight Preprod Readiness & Deployment Configuration Module
 * 
 * Provides validated configuration and preflight validation checks for
 * Midnight Preprod deployment environments.
 * 
 * Safety Rules:
 * - Default execution mode is strictly 'DRY_RUN'.
 * - 'LIVE' mode requires explicit opt-in and valid contract address.
 * - Zero secrets, seeds, or private keys are accepted or stored in configuration.
 * - Zero network calls or side-effects during configuration initialization.
 */

export type ExecutionMode = 'DRY_RUN' | 'LIVE';

export interface CredVeilPreprodConfig {
  network: 'preprod';
  mode: ExecutionMode;
  indexerUri: string;
  indexerWsUri: string;
  nodeWsUri: string;
  proofServerUri: string;
  contractAddress?: string;
}

export const DEFAULT_PREPROD_ENV_CONFIG: Readonly<CredVeilPreprodConfig> = Object.freeze({
  network: 'preprod' as const,
  mode: 'DRY_RUN' as const,
  indexerUri: 'https://indexer.preprod.midnight.network/api/v1/graphql',
  indexerWsUri: 'wss://indexer.preprod.midnight.network/api/v1/graphql/ws',
  nodeWsUri: 'wss://rpc.preprod.midnight.network',
  proofServerUri: 'http://127.0.0.1:6300',
});

/**
 * Loads Preprod configuration from environment variables or provided overrides,
 * defaulting to standard Midnight Preprod endpoints in DRY_RUN mode.
 */
export function getPreprodConfiguration(
  overrides: Partial<CredVeilPreprodConfig> = {}
): CredVeilPreprodConfig {
  const modeEnv = process.env.CREDVEIL_EXECUTION_MODE;
  const mode: ExecutionMode = (overrides.mode || modeEnv || 'DRY_RUN').toUpperCase() === 'LIVE' ? 'LIVE' : 'DRY_RUN';

  return {
    network: 'preprod',
    mode,
    indexerUri: overrides.indexerUri || process.env.MIDNIGHT_INDEXER_URI || DEFAULT_PREPROD_ENV_CONFIG.indexerUri,
    indexerWsUri: overrides.indexerWsUri || process.env.MIDNIGHT_INDEXER_WS_URI || DEFAULT_PREPROD_ENV_CONFIG.indexerWsUri,
    nodeWsUri: overrides.nodeWsUri || process.env.MIDNIGHT_NODE_WS_URI || DEFAULT_PREPROD_ENV_CONFIG.nodeWsUri,
    proofServerUri: overrides.proofServerUri || process.env.MIDNIGHT_PROOF_SERVER_URI || DEFAULT_PREPROD_ENV_CONFIG.proofServerUri,
    contractAddress: overrides.contractAddress || process.env.CREDVEIL_CONTRACT_ADDRESS || undefined
  };
}

/**
 * Validates Preprod configuration format and safety guarantees.
 * Throws a descriptive Error if validation fails.
 */
export function validatePreprodConfiguration(
  config: CredVeilPreprodConfig = getPreprodConfiguration()
): CredVeilPreprodConfig {
  if (config.network !== 'preprod') {
    throw new Error('Network must be explicitly set to "preprod"');
  }

  if (config.mode !== 'DRY_RUN' && config.mode !== 'LIVE') {
    throw new Error('Execution mode must be either "DRY_RUN" or "LIVE"');
  }

  // Validate URL syntax
  const urlsToValidate = [
    { name: 'indexerUri', value: config.indexerUri },
    { name: 'indexerWsUri', value: config.indexerWsUri },
    { name: 'nodeWsUri', value: config.nodeWsUri },
    { name: 'proofServerUri', value: config.proofServerUri }
  ];

  for (const item of urlsToValidate) {
    if (!item.value || typeof item.value !== 'string') {
      throw new Error(`Configuration field ${item.name} must be a non-empty string`);
    }
    try {
      new URL(item.value);
    } catch {
      throw new Error(`Configuration field ${item.name} contains invalid URL: "${item.value}"`);
    }
  }

  // If LIVE mode is requested, require a valid contract address
  if (config.mode === 'LIVE') {
    if (!config.contractAddress || typeof config.contractAddress !== 'string' || config.contractAddress.trim().length === 0) {
      throw new Error('Contract address is required when execution mode is set to "LIVE"');
    }
  }

  return config;
}
