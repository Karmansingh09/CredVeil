/**
 * CredVeil Midnight Lace Wallet Connector Foundation
 * 
 * Provides a typed abstraction for interacting with Midnight Lace Wallet (window.midnight.mnLace).
 * Safely handles environment checks, wallet discovery, authorization enablement, and network state inspection.
 */

import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

export interface LaceConnectionState {
  isAvailable: boolean;
  isConnected: boolean;
  networkId?: string;
  error?: string;
}

export interface LaceWalletConnectionResult {
  success: boolean;
  walletAPI?: ConnectedAPI;
  error?: string;
}

// Global Window type augmentation for Midnight Lace extension
declare global {
  interface Window {
    midnight?: {
      mnLace?: InitialAPI;
    };
  }
}

/**
 * Safely inspects whether Midnight Lace extension is installed in the target window context.
 */
export function isLaceAvailable(targetWindow: any = typeof window !== 'undefined' ? window : undefined): boolean {
  if (!targetWindow || typeof targetWindow !== 'object') {
    return false;
  }
  return Boolean(targetWindow.midnight?.mnLace);
}

/**
 * Retrieves the Midnight Lace connector instance from the target window context if available.
 */
export function getLaceConnector(targetWindow: any = typeof window !== 'undefined' ? window : undefined): InitialAPI | null {
  if (!isLaceAvailable(targetWindow)) {
    return null;
  }
  return targetWindow.midnight.mnLace;
}

/**
 * Connects to Midnight Lace wallet by requesting authorization for the target network.
 */
export async function connectLaceWallet(
  networkId = 'preprod',
  targetWindow: any = typeof window !== 'undefined' ? window : undefined
): Promise<LaceWalletConnectionResult> {
  const connector = getLaceConnector(targetWindow);

  if (!connector) {
    return {
      success: false,
      error: 'Midnight Lace Wallet extension is not installed or available'
    };
  }

  try {
    const walletAPI = await connector.connect(networkId);
    return {
      success: true,
      walletAPI
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to authorize Midnight Lace wallet connection'
    };
  }
}

/**
 * Inspects current connection status of Midnight Lace wallet.
 */
export async function getLaceConnectionStatus(
  targetWindow: any = typeof window !== 'undefined' ? window : undefined
): Promise<LaceConnectionState> {
  const available = isLaceAvailable(targetWindow);
  if (!available) {
    return {
      isAvailable: false,
      isConnected: false,
      error: 'Lace wallet extension not detected'
    };
  }

  return {
    isAvailable: true,
    isConnected: true
  };
}
