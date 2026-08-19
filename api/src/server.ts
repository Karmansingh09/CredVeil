/**
 * CredVeil Midnight Preprod HTTP Server Application
 * 
 * Native Node.js HTTP server exposing CredVeil API endpoints:
 * - GET  /health or /api/v1/health: Server health check
 * - GET  /api/v1/preprod/readiness: Midnight Preprod infrastructure readiness check
 * - POST /api/v1/preprod/prepare-eligibility: Local verify_eligibility descriptor preparation
 * - POST /api/v1/preprod/orchestrate: Full Preprod deployment/execution orchestration
 * 
 * Safety & Privacy Guarantees:
 * - Default execution mode is strictly DRY_RUN.
 * - LIVE mode requires explicit opt-in and valid contract address.
 * - Standard CORS headers enabled for web client integration.
 * - Zero private witness data (score/salt/keys/seeds) exposed or logged.
 */

import http from 'node:http';
import { CredVeilApiRouter, ApiResponse } from './api-router.js';
import { CredVeilExecutionProviders } from './transaction-executor.js';
import { ReadinessFetcher } from './preprod-readiness.js';

export interface ServerOptions {
  port?: number;
  host?: string;
  providers?: CredVeilExecutionProviders;
  fetcher?: ReadinessFetcher;
}

export function createCredVeilHttpServer(options: ServerOptions = {}) {
  const router = new CredVeilApiRouter(options.providers, options.fetcher);

  const requestListener: http.RequestListener = async (req, res) => {
    const timestamp = new Date().toISOString();

    // Standard CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle CORS preflight OPTIONS
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
      // 1. GET /health or GET /api/v1/health
      if (req.method === 'GET' && (pathname === '/health' || pathname === '/api/v1/health')) {
        const responseData: ApiResponse = {
          statusCode: 200,
          success: true,
          data: {
            service: 'CredVeil API',
            status: 'HEALTHY',
            network: 'preprod',
            mode: process.env.CREDVEIL_EXECUTION_MODE || 'DRY_RUN',
            timestamp
          },
          timestamp
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseData));
        return;
      }

      // 2. GET /api/v1/preprod/readiness
      if (req.method === 'GET' && pathname === '/api/v1/preprod/readiness') {
        const mode = url.searchParams.get('mode') as 'DRY_RUN' | 'LIVE' | null;
        const result = await router.handleReadinessRequest(mode ? { mode } : undefined);
        res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      // Read body for POST requests
      if (req.method === 'POST') {
        let rawBody = '';
        req.on('data', (chunk) => {
          rawBody += chunk;
        });

        await new Promise((resolve) => req.on('end', resolve));

        let body: any = {};
        if (rawBody.trim().length > 0) {
          try {
            body = JSON.parse(rawBody);
          } catch {
            const errRes: ApiResponse = {
              statusCode: 400,
              success: false,
              error: 'Invalid JSON payload in request body',
              timestamp
            };
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(errRes));
            return;
          }
        }

        // 3. POST /api/v1/preprod/prepare-eligibility
        if (pathname === '/api/v1/preprod/prepare-eligibility') {
          const result = await router.handlePrepareEligibilityRequest(body);
          res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result, (_k, v) => typeof v === 'bigint' ? v.toString() : v));
          return;
        }

        // 4. POST /api/v1/preprod/orchestrate
        if (pathname === '/api/v1/preprod/orchestrate') {
          const result = await router.handleOrchestrateRequest(body);
          res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result, (_k, v) => typeof v === 'bigint' ? v.toString() : v));
          return;
        }
      }

      // 404 Route Not Found
      const notFoundRes: ApiResponse = {
        statusCode: 404,
        success: false,
        error: `Route ${req.method} ${pathname} not found`,
        timestamp
      };
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(notFoundRes));
    } catch (err: any) {
      const serverErrRes: ApiResponse = {
        statusCode: 500,
        success: false,
        error: `Internal server error: ${err?.message || String(err)}`,
        timestamp
      };
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(serverErrRes));
    }
  };

  return http.createServer(requestListener);
}

export function startCredVeilServer(options: ServerOptions = {}) {
  const port = options.port || Number(process.env.PORT) || 3000;
  const host = options.host || '0.0.0.0';
  const server = createCredVeilHttpServer(options);

  server.listen(port, host, () => {
    console.log(`CredVeil API Server listening on http://${host}:${port} (Preprod Mode: ${process.env.CREDVEIL_EXECUTION_MODE || 'DRY_RUN'})`);
  });

  return server;
}
