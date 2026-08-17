# CredVeil

**Tagline**: *"Verify credentials. Reveal nothing else."*

CredVeil is a privacy-preserving DApp for verifiable academic credential verification, built on the **Midnight Network** using zero-knowledge smart contracts (Compact).

---

## Problem Statement

Traditional credential verification forces students and credential holders to disclose excessive private information. For example, when applying for a scholarship or job requiring an academic score of at least 75%, a applicant must present their full transcript or exact score (e.g., 87), revealing:
* Exact numeric scores / GPA
* Complete academic history
* Personal identifier details

This creates unnecessary privacy exposure. Verifiers only need to know whether the applicant satisfies the eligibility requirement (`score >= threshold`), not the exact underlying score or private details.

---

## CredVeil Use Case

CredVeil solves this problem using zero-knowledge proofs on the Midnight blockchain:

1. **Private Credential**: A student possesses a private test score (e.g., `87`) and a cryptographic salt.
2. **On-Chain Commitment**: The issuing institution registers a public credential commitment ($\text{hash}(\text{score}, \text{salt})$) on-chain.
3. **Verifier Requirement**: A verifier sets an eligibility threshold (e.g., `75`).
4. **Zero-Knowledge Proof**: The student runs a local Compact circuit in their browser/wallet that proves `score >= 75` and matches the commitment, without exposing the score `87`.
5. **Public Verification**: The Midnight Preprod smart contract verifies the ZK proof on-chain and updates the public verification count.

---

## Stellar New Moon Full Contest — Level 2: Waxing Crescent Requirements

CredVeil is designed to meet all Level 2 Waxing Crescent contest criteria:
* [x] **Lace Wallet Integration**: Connect and disconnect Midnight Lace Wallet (`window.midnight.mnLace`).
* [x] **Compact Circuit Execution**: Execute Compact smart contract circuits from the frontend DApp.
* [x] **Observable Privacy Behavior**: Prove eligibility (`score >= threshold`) without revealing the exact score.
* [ ] **Midnight Preprod Deployment**: Deploy contract to Midnight Preprod with a verifiable address *(In Progress)*.
* [x] **Meaningful Git Commits**: Maintain 15–25 structured, meaningful commits.
* [x] **Public GitHub Repository**: Comprehensive README, documentation, and privacy claim.
* [ ] **Live Frontend Deployment**: Hosted frontend application on Vercel *(In Progress)*.
* [ ] **Demo Video**: 2–3 minute demonstration of wallet connection, circuit call, and privacy claim verification *(In Progress)*.

---

## High-Level Architecture

```text
[ Student (Browser) ] ---> [ Lace Wallet ] ---> [ Compact Circuit (Local WASM) ]
                                                            |
                                                   Generates ZK Proof
                                                            |
                                                            v
[ Midnight Preprod Node ] <--- [ Midnight.js API ] <--- [ ZK Proof Tx ]
            |
    Updates Public Ledger
 (verification_count += 1)
```

Detailed architectural breakdowns can be found in the documentation:
* [System Architecture](file:///Users/karmansingh/Desktop/CredVeil/docs/architecture.md)
* [Privacy Model Specification](file:///Users/karmansingh/Desktop/CredVeil/docs/privacy-model.md)
* [Development Roadmap](file:///Users/karmansingh/Desktop/CredVeil/docs/development-roadmap.md)

---

## Current Development Status

> [!NOTE]
> **Status**: Milestone 1 (Project Specification & Workspace Initialization) Complete.
> **Notice**: Preprod contract deployment, Lace wallet integration, and live frontend deployment are currently in active development and NOT yet deployed.

---

## Workspace Structure

* `contract/`: Compact smart contract workspace (Compact 0.31.x).
* `api/`: Midnight.js integration layer and provider configurations.
* `credveil-ui/`: Vite + React frontend application interface.
* `docs/`: System architecture, privacy model, and development roadmap specifications.
