<p align="center">
  <img src="assets/logo.svg" alt="HuntLayer logo" width="96" height="96" />
</p>

<h1 align="center">HuntLayer</h1>

<p align="center"><strong>Decentralized, consensus-verified bug bounty protocol on GenLayer</strong><br/>
Severity assigned from PR evidence by AI validator consensus · Payout released on verified merge · Portable on-chain reputation</p>

<p align="center">
  <a href="https://opensource.org/license/mit/"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"/></a>
  <a href="https://docs.genlayer.com/"><img src="https://img.shields.io/badge/Docs-GenLayer-6d5df5" alt="GenLayer Docs"/></a>
  <a href="https://studio.genlayer.com"><img src="https://img.shields.io/badge/Network-Studionet-334155" alt="Network: Studionet"/></a>
</p>

<p align="center"><em>Work verified by consensus, paid on outcome, with portable reputation.</em></p>

---

## Overview

**HuntLayer** is not just an *Intelligent Contract* — it is a complete **end-to-end bug bounty protocol/platform** that combines:

- **Intelligent Contract** (on-chain logic, escrow/pool, state, payouts, reputation)
- **GenLayer consensus adjudication** (validators + AI to evaluate severity from PR evidence and verify merges)
- **Frontend dApp** (full user experience for the bounty lifecycle, wallet, and reputation)

Core workflow:

1. **Fund a bounty** with rewards per severity tier (Critical / High / Medium / Low), a deadline, and a pooled balance.
2. **Submit a fix PR** (GitHub) to a bounty.
3. **Evaluate severity** through validator consensus: PR evidence is fetched from the web and assessed by LLMs using comparison rules (severity + confidence).
4. **Release on merge**: validators verify the PR is merged; if valid and funds are sufficient, the payout is transferred and reputation is updated.
5. **Portable reputation**: reputation points, merge count, and total earned are recorded on-chain per researcher.

Built for the **Future of Work** theme: outcomes are verified and settled by decentralized consensus, not a single operator.

---

## Key Features

| Area | Capability |
|---|---|
| **Bounty lifecycle** | Create & fund bounties, top-up pool, set deadline metadata, close, and withdraw remaining pool (creator, after close) |
| **Submissions** | Submit PR URL bound to the bounty repo, anti-duplication (same PR cannot be reused), status checks |
| **AI severity consensus** | Leader/validator evaluation from GitHub PR evidence fetched on-chain; severity + confidence; tolerance-based agreement; critical claims gated by confidence |
| **Payout on merge** | Web-verified merge status before release; pool sufficiency checks; on-chain value transfer |
| **Reputation** | Weighted reputation (Critical 10 / High 5 / Medium 3 / Low 1), merge count, total earned |
| **Safety & controls** | Creator-only actions (close/reopen/withdraw), re-evaluation path, deterministic/expected-error handling for consensus, idempotent payout guards |
| **Frontend** | Landing, How it Works, Bounties dashboard, Reputation lookup, tx status/hash UX, EIP-6963 EVM connect (no popup conflicts) + GenLayerJS signing |

---

## Deployed Contract (Studionet)

- **Current contract (latest, redeployed)**: `0x3965DdBb9D61475Dc98d506714a6243AE3d55AeE`
- **Deploy tx**: `0xf84a77c9311955a5b8fdb939eac41515bf308552b83f8687c0c78cf94d194521` (ACCEPTED)
- **Network**: GenLayer Studionet
- **Frontend config**: `frontend/src/lib/config.ts` points to the current contract.
- **Evidence**: see [`TEST_EVIDENCE.md`](./TEST_EVIDENCE.md) for real on-chain method tests (positive/negative), merged-PR release flow, and `gltest` integration/adversarial results on the improved contract series.

> Previous deployments (historical): `0x8Cb7c556768aB3A72cfa7c8e4b488c09f63714c2` (improved, tested on Studionet; deploy `0x58da5bd...`) and `0x829068c07fDe9f71f5b41b3ef5423A141Ea46beF` (old ABI/signatures). The latest redeploy adds public bounty listing support (`get_bounty_count`) for the Explore UI.

---

## Repository Structure

```text
.
├─ contracts/
│  └─ huntlayer.py            # HuntLayer Intelligent Contract
├─ frontend/                  # Production frontend (React + Vite + TS + Tailwind)
│  ├─ src/components/ui/      # UI primitives + magnified-bento hero
│  ├─ src/pages/              # Landing, HowItWorks, Bounties, Reputation
│  ├─ src/services/           # genlayer-js + EIP-6963 wallet services
│  └─ src/lib/                # config, utils
├─ test/                      # Integration/adversarial tests (gltest)
├─ scripts/                   # On-chain test/deploy helper scripts
├─ TEST_EVIDENCE.md           # Studionet execution evidence
├─ gltest.config.yaml
└─ README.md
```

---

## Intelligent Contract

**File:** `contracts/huntlayer.py`  
**Class:** `HuntLayer(gl.Contract)` (pinned GenVM runner dependency)

### Methods (high level)

| Method | Type | Description |
|---|---|---|
| `create_bounty(...)` | write, payable | Create & fund bounty (rewards per tier, deadline metadata) |
| `fund_bounty(bounty_id)` | write, payable | Top-up bounty pool |
| `submit_pr(bounty_id, pr_url)` | write | Submit PR (must match bounty repo, anti-dup, status checks) |
| `evaluate_severity(bounty_id, submission_id)` | write | Consensus severity+confidence from fetched PR evidence |
| `release_bounty(bounty_id, submission_id)` | write | Verify merge & pay out; update reputation |
| `close_bounty(bounty_id)` | write | Creator closes bounty |
| `withdraw_pool(bounty_id)` | write | Creator withdraws remaining pool (bounty must be closed) |
| `reopen_evaluation(bounty_id, submission_id)` | write | Creator reopens evaluation (if unpaid) |
| `get_bounty(bounty_id)` | view | Bounty details & pool |
| `get_submissions(bounty_id)` | view | Submissions, severity/confidence/payout/status |
| `get_reputation(researcher)` | view | Reputation points |
| `get_contributor_stats(researcher)` | view | Reputation, merges, total earned |
| `get_bounty_count()` | view | Total number of bounties created (for public listing) |

**Consensus design:** non-deterministic web/LLM steps use leader/validator comparison (severity match + confidence tolerance), independent evidence fetching, and classified errors for robust agreement.

---

## Frontend

Located in **`frontend/`** (Vite + React + TypeScript + Tailwind).

- **GenLayer integration:** `genlayer-js` client (Studionet), read/write, tx wait/receipt handling, fee-estimation best-effort, provider-based connect aligned with docs.
- **Wallet:** EIP-6963 discovery to select a specific injected EVM provider (avoids popup conflicts) + real-wallet key signing option for Studionet; **no demo keys, no mock data — UI reads from on-chain state**.
- **UX:** pending/success/error states, tx hash display/copy, Studio link, responsive gray semi-dark theme, HuntLayer hero (magnified bento).

### Run locally

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

### Deploy (Vercel)

- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- Ensure `frontend/src/lib/config.ts` points to the intended contract/network.

---

## Testing & Validation

### Lint / schema

```bash
genvm-lint check contracts/huntlayer.py
```

### Integration tests (gltest)

```bash
# requires configured network and funded test accounts as appropriate
gltest test/test_huntlayer.py -v -s --network studionet
gltest test/test_adversarial.py -v -s --network studionet
```

Environment variables for tests/scripts (no hardcoded keys in repo):

- `CREATOR_KEY` — funded Studionet wallet private key
- `ADVERSARY_KEY` — adversary wallet private key (for adversarial tests)
- `HUNTLAYER_CONTRACT` — deployed contract address (optional override)

### On-chain evidence

Studionet redeploy and real-wallet runs (positive & negative tx hashes, merged-PR release, and `gltest` integration/adversarial passes) are documented in **[`TEST_EVIDENCE.md`](./TEST_EVIDENCE.md)**.

---

## Accuracy & Security Notes

- **Consensus reduces, not eliminates, LLM risk:** validators independently verify evidence and compare decision fields; appeals/finality add protection, but outputs depend on prompts, sources, and validator behavior.
- **Guards implemented:** creator-only controls, duplicate PR prevention, PR-to-bounty repo binding, merge verification before payout, pool sufficiency checks, confidence gating/tolerance for evaluations, idempotent payout guards, and creator withdrawal of remaining pool after close.
- **Deadline note:** `deadline` is stored as metadata and not auto-enforced by on-chain time (previous caller-supplied date checks removed to avoid untrusted enforcement). Creators should close bounties and withdraw remaining funds as needed.
- **Transfer/finality note:** payouts update on-chain accounting and emit value transfer; frontend confirms submitted transactions against finalized/successful execution where available. As with async transfer models, delivery semantics depend on the underlying chain/runtime.
- **Not mock/demo:** frontend and evidence flows are designed around real Studionet/on-chain interactions (use funded real wallets).

---

## Tech Stack

- **Contract:** GenLayer Intelligent Contracts (Python, GenVM)
- **Consensus/Runtime:** Optimistic Democracy, non-deterministic web+LLM ops
- **Frontend:** React, Vite, TypeScript, Tailwind, shadcn-style UI, GenLayerJS, EIP-6963
- **Tooling:** genlayer CLI, genvm-lint, gltest

---

## Links

- [GenLayer Documentation](https://docs.genlayer.com/)
- [GenLayer Studio](https://studio.genlayer.com)
- [GenLayerJS](https://github.com/genlayerlabs/genlayer-js)
- [Test Evidence](./TEST_EVIDENCE.md)

## License

MIT — see [LICENSE](./LICENSE).
