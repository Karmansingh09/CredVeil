/**
 * CredVeil Midnight Transaction Builder Integration Layer
 * 
 * Provides local transaction preparation descriptors for the CredVeil contract verify_eligibility circuit call.
 * 
 * Note on SDK Runtime Requirements:
 * Official Midnight.js 4.1.1 transaction submission (via createCircuitCallTxInterface / submitCallTx)
 * requires an active proof server, indexer connection, authorized wallet, and Effect contract context.
 * For offline validation, this module produces truthful PREPARED_LOCALLY descriptors without faking
 * transaction hashes or on-chain execution.
 */

import {
  prepareVerificationCall,
  VerificationCallConfig,
  PreparedVerificationCallDescriptor
} from './verification-call.js';
import { CredVeilCoreProviders } from './provider-factory.js';

export type TransactionLifecycleStage =
  | 'PREPARED_LOCALLY'
  | 'PROOF_GENERATED'
  | 'TRANSACTION_SUBMITTED'
  | 'TRANSACTION_CONFIRMED';

export interface PreparedEligibilityTransaction {
  descriptor: PreparedVerificationCallDescriptor;
  lifecycleStage: 'PREPARED_LOCALLY';
  preparedAt: string;
}

/**
 * Validates parameters and constructs a truthful local verify_eligibility transaction preparation descriptor.
 */
export function buildEligibilityTransaction(
  config: VerificationCallConfig
): PreparedEligibilityTransaction {
  const descriptor = prepareVerificationCall(config);

  return {
    descriptor,
    lifecycleStage: 'PREPARED_LOCALLY',
    preparedAt: new Date().toISOString()
  };
}

/**
 * Service orchestrating local CredVeil transaction preparation descriptors.
 */
export class CredVeilTransactionBuilder {
  constructor(private readonly providers: CredVeilCoreProviders) {}

  /**
   * Prepares a local verify_eligibility transaction descriptor.
   */
  prepareEligibilityTx(config: VerificationCallConfig): PreparedEligibilityTransaction {
    return buildEligibilityTransaction(config);
  }
}
