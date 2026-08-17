# CredVeil — System Architecture Specification

## Overview

CredVeil is structured into decoupled, modular components following the official Midnight `example-bboard` template design pattern:

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|  [ CredVeil React UI ] <------> [ Midnight.js API Layer ] <------> [ Lace Wallet ] |
+-----------------------------------------------------------------------------------+
                                          |
                                          v (Local Off-Chain ZK Proving)
+-----------------------------------------------------------------------------------+
|                                 PROVING LAYER                                     |
|                                                                                   |
|  [ Compact Circuit (WASM) ] <------> [ HTTP Proof Server / Lace Proof Provider ]  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v (ZK Proof & Ledger Mutation Tx)
+-----------------------------------------------------------------------------------+
|                                BLOCKCHAIN LAYER                                   |
|                                                                                   |
|  [ Midnight Preprod Node ] <------> [ Contract Ledger State ] <------> [ Indexer ] |
+-----------------------------------------------------------------------------------+
```

---

## Component Roles & Boundaries

### 1. Student / Holder (Client & Local State)
* Holds private credential values locally in the browser context:
  * `score`: `Uint<32>` (e.g., `87`)
  * `salt`: `Bytes<32>` (Cryptographic blinding factor)
* Private witness data is maintained strictly in browser memory / local storage and is never sent over network connections.

### 2. Compact Smart Contract (`contract/`)
* Written in **Compact 0.31.x** (`pragma language_version >= 0.31.0;`).
* Defines public contract ledger state:
  * `credential_commitment`: `Bytes<32>`
  * `eligibility_threshold`: `Uint<32>`
  * `verification_count`: `Uint<32>`
* Exposes exported circuit:
  * `verify_eligibility(score: Uint<32>, salt: Bytes<32>): Void`
* Evaluates zero-knowledge constraints (`assert`) off-chain during SNARK proof generation.

### 3. Midnight.js / API Layer (`api/`)
* Acts as the interface between the React UI and the Midnight blockchain.
* Configured for **Midnight Preprod Testnet** (`NetworkId.Preprod`).
* Wraps contract deployment, circuit invocation, and provider initialization (LevelDB private state provider, Indexer public data provider, HTTP proof provider).

### 4. Lace Wallet (Midnight Edition)
* Browser extension (`window.midnight.mnLace`).
* Manages user keypairs, unshielded address (`tNIGHT` faucet claims), and shielded address.
* Authorizes transaction signing and coordinates ZK proof generation via the DApp connector API (`@midnight-ntwrk/dapp-connector-api`).

### 5. Midnight Preprod Testnet
* Public testnet environment executing node consensus and state validation.
* Validates ZK proof payloads submitted in transactions.
* Mutates public ledger state (`verification_count += 1`) upon successful proof verification.

### 6. React UI (`credveil-ui/`)
* Built with Vite, React, TypeScript, and Vanilla CSS.
* Provides a dual-view interface:
  * **Holder View**: Local private inputs (`score`, `salt`).
  * **Verifier View**: Public threshold, status (`ELIGIBLE`), and privacy payload inspector.

### 7. Proof Server
* Executes zero-knowledge proof generation off-chain.
* Operates via the Lace DApp connector proof provider in the browser, backed by local or remote Midnight proof server endpoints.
