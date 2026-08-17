# CredVeil — Privacy Model Specification

## Core Privacy Objective

The goal of CredVeil is to enable verifiable academic credential checks without revealing sensitive private underlying data.

---

## Data Classification & Scoping

| Data Element | Type | Visibility | Location | Description |
| :--- | :--- | :--- | :--- | :--- |
| `score` | `Uint<32>` | **PRIVATE** | Local Browser Witness | Raw student score (e.g. `87`). |
| `salt` | `Bytes<32>` | **PRIVATE** | Local Browser Witness | Cryptographic blinding factor. |
| `credential_commitment` | `Bytes<32>` | **PUBLIC** | On-Chain Ledger | Hash of score + salt: `persistent_hash([score, salt])`. |
| `eligibility_threshold` | `Uint<32>` | **PUBLIC** | On-Chain Ledger | Minimum score requirement (e.g. `75`). |
| `verification_count` | `Uint<32>` | **PUBLIC** | On-Chain Ledger | Total number of successful verifications. |
| `result` | `Boolean` | **PUBLIC** | Transaction Outcome | Verification pass/fail status (`ELIGIBLE`). |

---

## Precise Privacy Claim

> [!IMPORTANT]
> **Primary Privacy Claim**:
> *"The student's private score is provided strictly as a private local input (witness parameter) to the off-chain ZK circuit execution. It is never written to or stored in the contract's public ledger state, nor transmitted in plaintext on-chain. The verifier and the public ledger learn only that the eligibility predicate (`score >= threshold`) passed, as evidenced by the proof-backed increment of the contract's public verification counter."*

---

## What Is NOT Claimed (Non-Goals & Scope Limits)

To maintain rigorous technical transparency, CredVeil explicitly does **NOT** claim:

1. **Transaction Anonymity Beyond Shielded State**: CredVeil does not obfuscate the public wallet address submitting the transaction unless shielded transactions are enabled in Lace Wallet.
2. **Commitment Unlinkability**: If a user re-uses the exact same `credential_commitment` multiple times across public contracts, an observer can correlate that the same credential is being verified, though they cannot deduce the underlying `score`.
3. **Issuer Key Revocation Accumulators**: This contest version focuses on commitment & predicate verification; full cryptographic revocation registries are out of scope.
