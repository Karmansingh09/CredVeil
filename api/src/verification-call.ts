/**
 * CredVeil Midnight Verification Call Layer
 * 
 * Prepares typed verify_eligibility circuit call descriptors utilizing compiled
 * Compact contract bindings and Midnight.js 4.1.1 provider interfaces.
 */

import {
  CredVeilPrivateWitnesses,
  createCredVeilContractInstance
} from './contract-service.js';
import { CredVeilCoreProviders } from './provider-factory.js';

export interface VerificationCallConfig {
  contractAddress: string;
  witnesses: CredVeilPrivateWitnesses;
}

export interface PreparedVerificationCallDescriptor {
  contractAddress: string;
  circuit: 'verify_eligibility';
  witnesses: CredVeilPrivateWitnesses;
  publicArguments: [];
  preparedLocally: boolean;
}

const UINT32_MAX = 4294967295n;

/**
 * Validates and prepares a verify_eligibility circuit call descriptor.
 */
export function prepareVerificationCall(
  config: VerificationCallConfig
): PreparedVerificationCallDescriptor {
  if (!config.contractAddress || config.contractAddress.trim().length === 0) {
    throw new Error('Contract address must be a non-empty string');
  }

  const { score, salt } = config.witnesses;

  if (typeof score !== 'bigint' || score < 0n || score > UINT32_MAX) {
    throw new Error('Score must be a Uint32-compatible non-negative bigint (0 <= score <= 4294967295)');
  }

  if (!(salt instanceof Uint8Array) || salt.length !== 32) {
    throw new Error('Salt must be a 32-byte Uint8Array');
  }

  return {
    contractAddress: config.contractAddress.trim(),
    circuit: 'verify_eligibility',
    witnesses: {
      score,
      salt
    },
    publicArguments: [],
    preparedLocally: true
  };
}

/**
 * Service class for constructing CredVeil verification circuit calls.
 */
export class CredVeilVerificationCallService {
  constructor(private readonly providers: CredVeilCoreProviders) {}

  prepareCall(config: VerificationCallConfig): PreparedVerificationCallDescriptor {
    return prepareVerificationCall(config);
  }
}
