/**
 * CredVeil Midnight Transaction Execution Layer
 * 
 * Provides typed transaction builders for deploying the CredVeil contract and
 * creating verify_eligibility circuit invocation interfaces using Midnight.js 4.1.1.
 */

import {
  CredVeilContractService,
  CredVeilDeploymentParams,
  CredVeilCircuitCallConfig,
  CredVeilPrivateWitnesses,
  createCredVeilContractInstance
} from './contract-service.js';
import { CredVeilCoreProviders } from './provider-factory.js';

export interface PreparedDeploymentTx {
  contractName: string;
  args: [Uint8Array, bigint];
  privateStateKey: string;
  publicArguments: [];
}

export interface PreparedVerificationTx {
  contractAddress: string;
  circuit: 'verify_eligibility';
  privateInputs: CredVeilPrivateWitnesses;
  publicArguments: [];
}

/**
 * Service orchestrating Midnight.js transaction interfaces for CredVeil.
 */
export class CredVeilTransactionService {
  private readonly contractService: CredVeilContractService;

  constructor(private readonly providers: CredVeilCoreProviders) {
    this.contractService = new CredVeilContractService(providers);
  }

  /**
   * Prepares and validates a CredVeil contract deployment transaction request.
   */
  prepareDeploymentTx(
    params: CredVeilDeploymentParams,
    privateStateKey = 'credveil_state'
  ): PreparedDeploymentTx {
    const deploymentPrep = this.contractService.prepareDeployment(params, privateStateKey);

    return {
      contractName: 'credveil',
      args: deploymentPrep.args,
      privateStateKey: deploymentPrep.privateStateKey,
      publicArguments: []
    };
  }

  /**
   * Prepares and validates a verify_eligibility circuit transaction request.
   */
  prepareVerificationTx(
    callConfig: CredVeilCircuitCallConfig
  ): PreparedVerificationTx {
    if (!callConfig.contractAddress || callConfig.contractAddress.length === 0) {
      throw new Error('Valid contract address is required for verification transaction');
    }

    const verificationPrep = this.contractService.prepareEligibilityVerification(callConfig);

    return {
      contractAddress: verificationPrep.contractAddress,
      circuit: 'verify_eligibility',
      privateInputs: verificationPrep.privateInputs,
      publicArguments: []
    };
  }
}
