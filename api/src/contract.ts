/**
 * CredVeil Contract Integration Wrapper
 * 
 * Imports compiled Compact contract bindings and wraps them for Midnight.js integration.
 */

import { Contract, ledger, Witnesses, Ledger } from '../../contract/src/managed/credveil/contract/index.js';
import contractInfo from '../../contract/src/managed/credveil/compiler/contract-info.json' with { type: 'json' };

export type CredVeilContractState = null;
export type CredVeilWitnesses = Witnesses<CredVeilContractState>;
export type CredVeilLedger = Ledger;
export type CredVeilContract = Contract<CredVeilContractState, CredVeilWitnesses>;

export { Contract as CredVeilContractClass, ledger as getCredVeilLedger };

export const CREDVEIL_CONTRACT_METADATA = {
  contractName: 'credveil',
  circuits: contractInfo.circuits,
  witnesses: contractInfo.witnesses,
  ledgerState: contractInfo.ledger
};
