/**
 * CredVeil Midnight Preprod Deployment & Execution Orchestrator Service
 * 
 * Orchestrates the full Preprod pipeline by linking:
 * 1. Preprod Configuration Validation (getPreprodConfiguration / validatePreprodConfiguration)
 * 2. Preflight Infrastructure Readiness Verification (verifyPreprodReadiness)
 * 3. Local Transaction Descriptor Preparation (CredVeilTransactionBuilder)
 * 4. Midnight.js 4.1.1 Transaction Execution (CredVeilTransactionExecutor)
 * 
 * Safety Guarantees:
 * - Immutable Default: 'DRY_RUN' mode never submits live transactions or connects to wallets.
 * - Live Mode Requirement: 'LIVE' mode requires explicit opt-in and all readiness checks to PASS.
 * - Zero Auto-Fallback: If 'LIVE' mode readiness fails, execution halts safely without falling back to DRY_RUN.
 * - Zero Fake Hashes: Execution returns truthful outcomes and real SDK errors.
 * - Privacy Preservation: Witness inputs (score, salt) remain private; publicArguments is strictly [].
 */

import {
  CredVeilPreprodConfig,
  getPreprodConfiguration,
  validatePreprodConfiguration
} from './preprod-config.js';
import {
  verifyPreprodReadiness,
  PreprodReadinessReport,
  ReadinessFetcher
} from './preprod-readiness.js';
import {
  PreparedEligibilityTransaction,
  buildEligibilityTransaction
} from './transaction-builder.js';
import {
  CredVeilTransactionExecutor,
  ExecutionResult,
  CredVeilExecutionProviders
} from './transaction-executor.js';
import { VerificationCallConfig } from './verification-call.js';

export interface OrchestrationResult {
  mode: 'DRY_RUN' | 'LIVE';
  network: 'preprod';
  readiness: PreprodReadinessReport;
  preparedTx?: PreparedEligibilityTransaction;
  execution?: ExecutionResult;
  executed: boolean;
  message: string;
  timestamp: string;
}

export class CredVeilPreprodOrchestrator {
  constructor(
    private readonly customConfig?: Partial<CredVeilPreprodConfig>,
    private readonly providers?: CredVeilExecutionProviders,
    private readonly fetcher?: ReadinessFetcher
  ) {}

  /**
   * Orchestrates the complete Preprod verification workflow.
   */
  async orchestrateEligibilityVerification(
    verificationConfig: VerificationCallConfig
  ): Promise<OrchestrationResult> {
    const timestamp = new Date().toISOString();

    // 1. Resolve and validate configuration
    let config: CredVeilPreprodConfig;
    try {
      config = validatePreprodConfiguration(getPreprodConfiguration(this.customConfig));
    } catch (err: any) {
      const dummyReadiness: PreprodReadinessReport = {
        ready: false,
        mode: this.customConfig?.mode === 'LIVE' ? 'LIVE' : 'DRY_RUN',
        network: 'preprod',
        checks: [
          {
            name: 'configuration_preflight',
            status: 'FAIL',
            message: `Configuration error: ${err?.message || String(err)}`
          }
        ],
        generatedAt: timestamp
      };

      return {
        mode: this.customConfig?.mode === 'LIVE' ? 'LIVE' : 'DRY_RUN',
        network: 'preprod',
        readiness: dummyReadiness,
        executed: false,
        message: `Orchestration halted due to configuration error: ${err?.message || String(err)}`,
        timestamp
      };
    }

    // 2. Execute preflight infrastructure readiness verification
    const readiness = await verifyPreprodReadiness(config, this.fetcher);

    // 3. Handle DRY_RUN mode execution path
    if (config.mode === 'DRY_RUN') {
      let preparedTx: PreparedEligibilityTransaction | undefined;
      try {
        preparedTx = buildEligibilityTransaction(verificationConfig);
      } catch (err: any) {
        return {
          mode: 'DRY_RUN',
          network: 'preprod',
          readiness,
          executed: false,
          message: `Local transaction preparation failed in DRY_RUN: ${err?.message || String(err)}`,
          timestamp
        };
      }

      return {
        mode: 'DRY_RUN',
        network: 'preprod',
        readiness,
        preparedTx,
        executed: false,
        message: 'Preprod orchestration completed cleanly in DRY_RUN mode. No on-chain transaction submitted.',
        timestamp
      };
    }

    // 4. Handle LIVE mode execution path
    if (!readiness.ready) {
      return {
        mode: 'LIVE',
        network: 'preprod',
        readiness,
        executed: false,
        message: 'Preprod orchestration halted in LIVE mode: Infrastructure readiness check failed.',
        timestamp
      };
    }

    // 5. Attempt live transaction execution via CredVeilTransactionExecutor
    const executor = new CredVeilTransactionExecutor(this.providers);
    const execution = await executor.executeEligibilityVerification(verificationConfig);

    return {
      mode: 'LIVE',
      network: 'preprod',
      readiness,
      preparedTx: execution.preparedTx,
      execution,
      executed: execution.success,
      message: execution.success
        ? 'Preprod live transaction executed and confirmed successfully.'
        : `Preprod live transaction failed: ${execution.error || 'Execution error'}`,
      timestamp
    };
  }
}
