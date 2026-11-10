# HuntLayer

**Automated bug bounties on GenLayer** — severity tier assigned from PR evidence by AI consensus, bounty released on verified merge, with portable on-chain reputation.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![GenLayer Docs](https://img.shields.io/badge/Docs-GenLayer-6d5df5)](https://docs.genlayer.com/)
[![Network](https://img.shields.io/badge/Network-Studionet-334155)](https://studio.genlayer.com)

> *Work verified by consensus, paid on outcome, with portable reputation.*

---

## Overview

HuntLayer is a GenLayer Intelligent Contract + dApp for **trust-minimized bug bounty workflows**:

1. **Fund a bounty** with per-severity rewards (Critical / High / Medium / Low), deadlines, and a pooled balance.
2. **Submit a fix PR** (GitHub) to a bounty.
3. **Evaluate severity** via GenLayer validators: PR evidence is fetched from the web and assessed by LLMs under consensus (with confidence & comparison rules).
4. **Release on merge**: validators verify the PR is merged; if valid and funds are sufficient, payout is transferred and reputation is updated.
5. **Portable reputation**: on-chain reputation points, merge count, and total earned per researcher.

This project targets the **Future of Work** theme: outcomes adjudicated by decentralized consensus rather than a single trusted operator.

---

## Key Features

| Area | Capability |
|---|---|
| **Bounty lifecycle** | Create & fund bounties, top-up pool, set deadline, close/expire |
| **Submissions** | Submit PR URL, anti-duplication (same PR cannot be reused), deadline/status checks |
| **AI severity consensus** | Leader/validator evaluation from GitHub PR evidence; severity + confidence; tolerance-based agreement; critical claims gated by confidence |
| **Payout on merge** | Web-verified merge status before release; pool sufficiency checks; on-chain value transfer |
| **Reputation** | Weighted reputation (Critical 10 / High 5 / Medium 3 / Low 1), merge count, total earned |
| **Safety & controls** | Creator-only actions (close/reopen), re-evaluation path, deterministic/expected-error handling for consensus, appeal-compatible design |
| **Frontend** | Landing, How it Works, Bounties dashboard, Reputation lookup, tx status/hash UX, EIP-6963 EVM connect (no popup conflicts) + GenLayerJS signing |

---

## Deployed Contract (Studionet)

- **Contract**: `0x829068c07fDe9f71f5b41b3ef5423A141Ea46beF`
- **Network**: GenLayer Studionet
- **Evidence**: see [`TEST_EVIDENCE.md`](./TEST_EVIDENCE.md) for on-chain positive/negative test runs, tx hashes, and method coverage.

> Contract address may change with redeployments; update `frontend/src/lib/config.ts` accordingly.

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
| `create_bounty(...)` | write, payable | Create & fund bounty (rewards per tier, deadline) |
| `fund_bounty(bounty_id)` | write, payable | Top-up bounty pool |
| `submit_pr(bounty_id, pr_url, current_date)` | write | Submit PR (anti-dup, deadline/status checks) |
| `evaluate_severity(bounty_id, submission_id, current_date)` | write | Consensus severity+confidence from PR evidence |
| `release_bounty(bounty_id, submission_id, current_date)` | write | Verify merge & pay out; update reputation |
| `close_bounty(bounty_id)` | write | Creator closes bounty |
| `close_if_expired(bounty_id, current_date)` | write | Mark closed if past deadline |
| `reopen_evaluation(bounty_id, submission_id)` | write | Creator reopens evaluation (if unpaid) |
| `get_bounty(bounty_id)` | view | Bounty details & pool |
| `get_submissions(bounty_id)` | view | Submissions, severity/confidence/payout/status |
| `get_reputation(researcher)` | view | Reputation points |
| `get_contributor_stats(researcher)` | view | Reputation, merges, total earned |

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

Comprehensive Studionet runs (positive & negative, tx hashes, adversarial rejections) are documented in **[`TEST_EVIDENCE.md`](./TEST_EVIDENCE.md)**.

---

## Accuracy & Security Notes

- **Consensus reduces, not eliminates, LLM risk:** validators independently verify evidence and compare decision fields; appeals/finality add protection, but outputs depend on prompts, sources, and validator behavior.
- **Guards implemented:** creator-only controls, duplicate PR prevention, merge verification before payout, pool sufficiency checks, deadline handling, confidence gating/tolerance for evaluations.
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
