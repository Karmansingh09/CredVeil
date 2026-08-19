/**
 * CredVeil Midnight Preprod API Router & Handler Layer
 * 
 * Exposes a structured HTTP request dispatcher and API routing layer for client integration:
 * - GET  /api/v1/preprod/readiness: Preflight infrastructure readiness check
 * - POST /api/v1/preprod/prepare-eligibility: Local verify_eligibility descriptor preparation
 * - POST /api/v1/preprod/orchestrate: Full Preprod deployment/execution orchestration
 * 
 * Safety & Privacy Guarantees:
 * - Default execution mode is strictly DRY_RUN.
 * - LIVE mode requires explicit opt-in and valid contract address.
 * - Returns structured JSON with standard HTTP status codes (200, 400, 500, 503).
 * - Zero private witness data (score/salt/keys/seeds) is exposed in API responses or logs.
 */

import { CredVeilPreprodConfig } from './preprod-config.js';
import { verifyPreprodReadiness, PreprodReadinessReport, ReadinessFetcher } from './preprod-readiness.js';
import { PreparedEligibilityTransaction, buildEligibilityTransaction } from './transaction-builder.js';
import { CredVeilPreprodOrchestrator, OrchestrationResult } from './preprod-orchestrator.js';
import { CredVeilExecutionProviders } from './transaction-executor.js';
import { VerificationCallConfig } from './verification-call.js';

export interface ApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PrepareEligibilityRequestBody {
  contractAddress: string;
  score: string | number | bigint;
  saltHex?: string;
}

export interface OrchestrateRequestBody {
  config?: Partial<CredVeilPreprodConfig>;
  verificationConfig: {
    contractAddress: string;
    score: string | number | bigint;
    saltHex?: string;
  };
}

export class CredVeilApiRouter {
  constructor(
    private readonly providers?: CredVeilExecutionProviders,
    private readonly fetcher?: ReadinessFetcher
  ) {}

  /**
   * Handles GET /api/v1/preprod/readiness
   */
  async handleReadinessRequest(
    customConfig?: Partial<CredVeilPreprodConfig>
  ): Promise<ApiResponse<PreprodReadinessReport>> {
    const timestamp = new Date().toISOString();
    try {
      const report = await verifyPreprodReadiness(customConfig, this.fetcher);
      return {
        statusCode: report.ready ? 200 : 503,
        success: report.ready,
        data: report,
        timestamp
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        success: false,
        error: `Readiness check failed: ${err?.message || String(err)}`,
        timestamp
      };
    }
  }

  /**
   * Handles POST /api/v1/preprod/prepare-eligibility
   */
  async handlePrepareEligibilityRequest(
    body: PrepareEligibilityRequestBody
  ): Promise<ApiResponse<PreparedEligibilityTransaction>> {
    const timestamp = new Date().toISOString();

    try {
      if (!body || typeof body !== 'object') {
        return {
          statusCode: 400,
          success: false,
          error: 'Request body must be a valid JSON object',
          timestamp
        };
      }

      if (!body.contractAddress || typeof body.contractAddress !== 'string' || body.contractAddress.trim().length === 0) {
        return {
          statusCode: 400,
          success: false,
          error: 'Parameter contractAddress must be a non-empty string',
          timestamp
        };
      }

      let scoreBigInt: bigint;
      try {
        scoreBigInt = BigInt(body.score);
      } catch {
        return {
          statusCode: 400,
          success: false,
          error: 'Parameter score must be a valid Uint32 integer',
          timestamp
        };
      }

      let salt: Uint8Array;
      if (body.saltHex && typeof body.saltHex === 'string') {
        const hex = body.saltHex.trim().replace(/^0x/, '');
        if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
          return {
            statusCode: 400,
            success: false,
            error: 'Parameter saltHex must be a 64-character hex string (32 bytes)',
            timestamp
          };
        }
        salt = Uint8Array.from(Buffer.from(hex, 'hex'));
      } else {
        salt = new Uint8Array(32);
      }

      const verificationConfig: VerificationCallConfig = {
        contractAddress: body.contractAddress.trim(),
        witnesses: {
          score: scoreBigInt,
          salt
        }
      };

      const preparedTx = buildEligibilityTransaction(verificationConfig);

      return {
        statusCode: 200,
        success: true,
        data: preparedTx,
        timestamp
      };
    } catch (err: any) {
      return {
        statusCode: 400,
        success: false,
        error: `Prepare eligibility failed: ${err?.message || String(err)}`,
        timestamp
      };
    }
  }

  /**
   * Handles POST /api/v1/preprod/orchestrate
   */
  async handleOrchestrateRequest(
    body: OrchestrateRequestBody
  ): Promise<ApiResponse<OrchestrationResult>> {
    const timestamp = new Date().toISOString();

    try {
      if (!body || typeof body !== 'object' || !body.verificationConfig) {
        return {
          statusCode: 400,
          success: false,
          error: 'Request body must contain verificationConfig',
          timestamp
        };
      }

      const vCfg = body.verificationConfig;
      if (!vCfg.contractAddress || typeof vCfg.contractAddress !== 'string' || vCfg.contractAddress.trim().length === 0) {
        return {
          statusCode: 400,
          success: false,
          error: 'verificationConfig.contractAddress must be a non-empty string',
          timestamp
        };
      }

      let scoreBigInt: bigint;
      try {
        scoreBigInt = BigInt(vCfg.score);
      } catch {
        return {
          statusCode: 400,
          success: false,
          error: 'verificationConfig.score must be a valid Uint32 integer',
          timestamp
        };
      }

      let salt: Uint8Array;
      if (vCfg.saltHex && typeof vCfg.saltHex === 'string') {
        const hex = vCfg.saltHex.trim().replace(/^0x/, '');
        if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
          return {
            statusCode: 400,
            success: false,
            error: 'verificationConfig.saltHex must be a 64-character hex string (32 bytes)',
            timestamp
          };
        }
        salt = Uint8Array.from(Buffer.from(hex, 'hex'));
      } else {
        salt = new Uint8Array(32);
      }

      const verificationCallConfig: VerificationCallConfig = {
        contractAddress: vCfg.contractAddress.trim(),
        witnesses: {
          score: scoreBigInt,
          salt
        }
      };

      const orchestrator = new CredVeilPreprodOrchestrator(body.config, this.providers, this.fetcher);
      const result = await orchestrator.orchestrateEligibilityVerification(verificationCallConfig);

      const statusCode = result.executed
        ? 200
        : result.readiness.ready
        ? 200
        : 400;

      return {
        statusCode,
        success: result.mode === 'DRY_RUN' ? true : result.executed,
        data: result,
        timestamp
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        success: false,
        error: `Orchestration request failed: ${err?.message || String(err)}`,
        timestamp
      };
    }
  }
}
