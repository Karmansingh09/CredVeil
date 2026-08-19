/**
 * CredVeil Midnight Preprod Infrastructure Readiness Verifier
 * 
 * Conducts preflight readiness checks against Midnight Preprod infrastructure
 * endpoints (Indexer GraphQL/WS, Node RPC/WS, Proof Server, Contract Address).
 * 
 * Safety Guarantees:
 * - Readiness checks NEVER submit transactions, generate proofs, or connect to Lace wallets.
 * - In DRY_RUN mode (default), safe connectivity is verified or marked SKIPPED cleanly.
 * - In LIVE mode, all required endpoints and valid contract address must PASS.
 * - Zero private witness data (score/salt/keys/seeds) is accepted or logged.
 */

import {
  CredVeilPreprodConfig,
  getPreprodConfiguration,
  validatePreprodConfiguration
} from './preprod-config.js';

export type PreprodCheckStatus = 'PASS' | 'FAIL' | 'SKIPPED';

export interface PreprodCheckResult {
  name: string;
  status: PreprodCheckStatus;
  message: string;
  latencyMs?: number;
}

export interface PreprodReadinessReport {
  ready: boolean;
  mode: 'DRY_RUN' | 'LIVE';
  network: 'preprod';
  checks: PreprodCheckResult[];
  generatedAt: string;
}

export type ReadinessFetcher = (
  url: string,
  options?: { timeoutMs?: number; headers?: Record<string, string>; method?: string }
) => Promise<{ ok: boolean; status: number; statusText: string }>;

/**
 * Default HTTP fetcher with bounded timeout handling.
 */
export async function defaultReadinessFetcher(
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string>; method?: string } = {}
): Promise<{ ok: boolean; status: number; statusText: string }> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      signal: controller.signal
    });
    return { ok: res.ok, status: res.status, statusText: res.statusText };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs infrastructure readiness checks for Midnight Preprod environment.
 */
export async function verifyPreprodReadiness(
  customConfig?: Partial<CredVeilPreprodConfig>,
  fetcher: ReadinessFetcher = defaultReadinessFetcher
): Promise<PreprodReadinessReport> {
  const generatedAt = new Date().toISOString();

  // 1. Validate configuration formatting
  let config: CredVeilPreprodConfig;
  try {
    config = validatePreprodConfiguration(getPreprodConfiguration(customConfig));
  } catch (err: any) {
    return {
      ready: false,
      mode: customConfig?.mode === 'LIVE' ? 'LIVE' : 'DRY_RUN',
      network: 'preprod',
      checks: [
        {
          name: 'configuration_preflight',
          status: 'FAIL',
          message: `Configuration validation error: ${err?.message || String(err)}`
        }
      ],
      generatedAt
    };
  }

  const checks: PreprodCheckResult[] = [];

  // Check 1: Indexer GraphQL HTTP Endpoint
  const startIndexer = Date.now();
  try {
    const res = await fetcher(config.indexerUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeoutMs: 5000
    });
    const latencyMs = Date.now() - startIndexer;
    if (res.ok || res.status === 400 /* GraphQL POST body missing returns 400 but proves endpoint reachable */) {
      checks.push({
        name: 'indexer_graphql',
        status: 'PASS',
        message: `Indexer GraphQL endpoint reachable (HTTP ${res.status})`,
        latencyMs
      });
    } else {
      checks.push({
        name: 'indexer_graphql',
        status: 'FAIL',
        message: `Indexer GraphQL endpoint returned status ${res.status} ${res.statusText}`,
        latencyMs
      });
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startIndexer;
    const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('timeout');
    checks.push({
      name: 'indexer_graphql',
      status: 'FAIL',
      message: isTimeout ? 'Indexer GraphQL endpoint timed out after 5000ms' : `Indexer GraphQL connection error: ${err?.message || String(err)}`,
      latencyMs
    });
  }

  // Check 2: Indexer WebSocket Endpoint Syntax Check
  try {
    const parsedWs = new URL(config.indexerWsUri);
    if (parsedWs.protocol === 'ws:' || parsedWs.protocol === 'wss:') {
      checks.push({
        name: 'indexer_ws',
        status: 'PASS',
        message: `Indexer WebSocket URL syntax valid: ${config.indexerWsUri}`
      });
    } else {
      checks.push({
        name: 'indexer_ws',
        status: 'FAIL',
        message: `Invalid WebSocket protocol in URL: ${config.indexerWsUri}`
      });
    }
  } catch {
    checks.push({
      name: 'indexer_ws',
      status: 'FAIL',
      message: `Invalid Indexer WebSocket URL syntax: ${config.indexerWsUri}`
    });
  }

  // Check 3: Node WebSocket / RPC Endpoint Syntax Check
  try {
    const parsedNode = new URL(config.nodeWsUri);
    if (parsedNode.protocol === 'ws:' || parsedNode.protocol === 'wss:' || parsedNode.protocol === 'http:' || parsedNode.protocol === 'https:') {
      checks.push({
        name: 'node_rpc',
        status: 'PASS',
        message: `Node RPC URL syntax valid: ${config.nodeWsUri}`
      });
    } else {
      checks.push({
        name: 'node_rpc',
        status: 'FAIL',
        message: `Invalid Node RPC protocol in URL: ${config.nodeWsUri}`
      });
    }
  } catch {
    checks.push({
      name: 'node_rpc',
      status: 'FAIL',
      message: `Invalid Node RPC URL syntax: ${config.nodeWsUri}`
    });
  }

  // Check 4: Proof Server HTTP Endpoint
  const startProof = Date.now();
  try {
    const res = await fetcher(config.proofServerUri, {
      method: 'GET',
      timeoutMs: 5000
    });
    const latencyMs = Date.now() - startProof;
    if (res.ok || res.status === 404 /* Proof server running without GET route returns 404 but is online */) {
      checks.push({
        name: 'proof_server',
        status: 'PASS',
        message: `Proof server endpoint reachable (HTTP ${res.status})`,
        latencyMs
      });
    } else {
      checks.push({
        name: 'proof_server',
        status: 'FAIL',
        message: `Proof server returned HTTP ${res.status} ${res.statusText}`,
        latencyMs
      });
    }
  } catch (err: any) {
    const latencyMs = Date.now() - startProof;
    const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('timeout');
    checks.push({
      name: 'proof_server',
      status: 'FAIL',
      message: isTimeout ? 'Proof server endpoint timed out after 5000ms' : `Proof server connection error: ${err?.message || String(err)}`,
      latencyMs
    });
  }

  // Check 5: Contract Address Check (Required in LIVE mode, Optional in DRY_RUN)
  if (config.contractAddress && config.contractAddress.trim().length > 0) {
    checks.push({
      name: 'contract_address',
      status: 'PASS',
      message: `Deployed contract address configured: ${config.contractAddress.trim()}`
    });
  } else if (config.mode === 'LIVE') {
    checks.push({
      name: 'contract_address',
      status: 'FAIL',
      message: 'Contract address is required in LIVE mode but missing'
    });
  } else {
    checks.push({
      name: 'contract_address',
      status: 'SKIPPED',
      message: 'Contract address omitted in DRY_RUN mode'
    });
  }

  // Determine overall readiness
  const hasFailures = checks.some((c) => c.status === 'FAIL');
  const ready = !hasFailures;

  return {
    ready,
    mode: config.mode,
    network: 'preprod',
    checks,
    generatedAt
  };
}
