/**
 * CredVeil Contract Service Layer
 * 
 * Provides typed contract deployment and circuit invocation preparation
 * utilizing compiled Compact contract bindings and Midnight.js 4.1.1.
 */

import { Contract, ledger, Witnesses, Ledger } from '../../contract/src/managed/credveil/contract/index.js';
import contractInfo from '../../contract/src/managed/credveil/compiler/contract-info.json' with { type: 'json' };
import { CredVeilCoreProviders } from './provider-factory.js';

export interface CredVeilPrivateWitnesses {
  score: bigint;
  salt: Uint8Array;
}

export interface CredVeilDeploymentParams {
  credentialCommitment: Uint8Array;
  eligibilityThreshold: bigint;
}

export interface CredVeilDeploymentConfig {
  params: CredVeilDeploymentParams;
  privateStateKey?: string;
}

export interface CredVeilCircuitCallConfig {
  contractAddress: string;
  witnesses: CredVeilPrivateWitnesses;
  privateStateKey?: string;
}

/**
 * Creates private witness handler callbacks for the CredVeil contract instance.
 */
export function createCredVeilWitnesses(privateInputs: CredVeilPrivateWitnesses): Witnesses<null> {
  return {
    get_secret_score: (context) => [context.privateState, privateInputs.score],
    get_secret_salt: (context) => [context.privateState, privateInputs.salt]
  };
}

/**
 * Constructs a CredVeil Contract instance with local private witness callbacks.
 */
export function createCredVeilContractInstance(privateInputs: CredVeilPrivateWitnesses): Contract<null, Witnesses<null>> {
  return new Contract<null, Witnesses<null>>(createCredVeilWitnesses(privateInputs));
}

/**
 * Service wrapper preparing deployment parameters and circuit calls.
 */
export class CredVeilContractService {
  constructor(private readonly providers: CredVeilCoreProviders) {}

  /**
   * Prepares deployment configuration for CredVeil contract.
   */
  prepareDeployment(params: CredVeilDeploymentParams, privateStateKey = 'credveil_state') {
    if (params.credentialCommitment.length !== 32) {
      throw new Error('Credential commitment must be a 32-byte Uint8Array');
    }
    if (params.eligibilityThreshold < 0n) {
      throw new Error('Eligibility threshold must be a non-negative integer');
    }

    return {
      contract: new Contract({
        get_secret_score: (context) => [context.privateState, 0n],
        get_secret_salt: (context) => [context.privateState, new Uint8Array(32)]
      }),
      args: [params.credentialCommitment, params.eligibilityThreshold] as [Uint8Array, bigint],
      privateStateKey
    };
  }

  /**
   * Prepares circuit invocation payload for verify_eligibility without exposing private inputs as public arguments.
   */
  prepareEligibilityVerification(callConfig: CredVeilCircuitCallConfig) {
    const contractInstance = createCredVeilContractInstance(callConfig.witnesses);

    return {
      contractAddress: callConfig.contractAddress,
      circuit: 'verify_eligibility' as const,
      contract: contractInstance,
      privateInputs: callConfig.witnesses, // Handled locally via witnesses
      publicArguments: [] // Pure verification: 0 public arguments
    };
  }
}
