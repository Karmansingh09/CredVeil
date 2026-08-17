# CredVeil — Development Roadmap & Milestone Plan

## Contest Goals & Target Milestones

CredVeil targets **Stellar New Moon Full Contest — Level 2: Waxing Crescent**.
We follow a structured development workflow with 15–25 meaningful git commits.

---

## Milestone Breakdown & Commit Schedule

### Stage 1 & 2: Environment Audit & Toolchain Setup (Completed)
* Status: Complete (`Node.js v24.14.1`, `Compact CLI 0.5.1`, compiler `0.31.1`).

### Milestone 1: Documentation & Workspace Specification (Current)
* [x] Create project `README.md`
* [x] Create `docs/architecture.md`
* [x] Create `docs/privacy-model.md`
* [x] Create `docs/development-roadmap.md`
* [x] Establish workspace directory structure (`contract/`, `api/`, `credveil-ui/`)
* **Planned Commit 1**: `chore: initialize CredVeil workspace and document system architecture`

### Milestone 2: Compact 0.31.x Smart Contract (`contract/`)
* [ ] Write `contract/src/credveil.compact`
* [ ] Compile contract using `compact compile`
* [ ] Verify generated TypeScript client bindings (`contract/src/managed/credveil`)
* **Planned Commit 2**: `feat(contract): implement CredVeil Compact smart contract and build bindings`

### Milestone 3: Midnight.js API Integration Layer (`api/`)
* [ ] Create Midnight Preprod network configuration (`NetworkId.Preprod`)
* [ ] Build contract client deployment and circuit execution service wrappers
* [ ] Build Lace Wallet DApp connector provider setup
* **Planned Commit 3**: `feat(api): implement Midnight.js integration and Lace wallet provider service`

### Milestone 4: Privacy-Preserving Frontend Application (`credveil-ui/`)
* [ ] Initialize Vite + React workspace
* [ ] Implement design system (dark mode, glassmorphism, responsive cards)
* [ ] Build `WalletConnect.tsx` (Lace wallet enable/disable state)
* [ ] Build `HolderView.tsx` (Private score & salt input)
* [ ] Build `VerifierView.tsx` (Public threshold & status view)
* [ ] Build `PrivacyInspector.tsx` (Side-by-side payload & state inspector)
* **Planned Commit 4**: `feat(ui): implement CredVeil DApp interface with Lace wallet integration`

### Milestone 5: End-to-End Verification & Preprod Deployment
* [ ] Pre-fund testnet wallet via Midnight Preprod Faucet (`tNIGHT` & `tDUST`)
* [ ] Deploy `credveil.compact` to Midnight Preprod
* [ ] Perform end-to-end verification circuit execution
* [ ] Record contract deployment address and transaction hashes
* **Planned Commit 5**: `feat(deploy): deploy CredVeil smart contract to Midnight Preprod`

### Milestone 6: Documentation Polish, Live Hosting & Demo Video
* [ ] Update `README.md` with live deployed contract address & Vercel deployment link
* [ ] Deploy frontend DApp to Vercel
* [ ] Record 2–3 minute demonstration video showcasing Lace wallet connection, circuit call, and observable privacy claim
* **Planned Commit 6**: `docs: finalize README with verifiable Preprod contract address and demo link`

---

## Contest Submission Checklist

- [ ] Lace wallet connect/disconnect functionality working.
- [ ] Successfully call Compact circuit from frontend.
- [ ] Observable privacy behavior demonstrated in UI.
- [ ] Contract deployed to Midnight Preprod with verifiable address.
- [ ] Minimum 8 meaningful Git commits (Target: 15–25 commits).
- [ ] Public GitHub repository with comprehensive README.
- [ ] Live frontend deployment on Vercel.
- [ ] Demo video showing wallet connection + successful circuit call.
- [ ] README documenting exact privacy claim.
