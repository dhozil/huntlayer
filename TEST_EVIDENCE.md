# HuntLayer — Test Evidence (Studionet)

> **Historical evidence:** this document records transactions from the previously deployed Studionet contract (`0x829068c07fDe9f71f5b41b3ef5423A141Ea46beF`) and its method signatures at that time. The contract and frontend have since been improved (fund recovery via `withdraw_pool`, PR-to-repo binding, removal of untrusted caller-supplied date parameters, stricter frontend tx finalization checks). A redeployment and fresh on-chain test run are required to produce evidence for the updated contract.

Documentation of **real on-chain execution on GenLayer Studionet** (not mocked), using funded Studionet wallets (kept private).

## Environment & Identities
- **Network**: GenLayer Studionet
- **Contract (final, wallet-deployed)**: `0x829068c07fDe9f71f5b41b3ef5423A141Ea46beF`
- **Deploy tx**: `0x3da22d38844b411022fbc5801ab98cda8c26ec1d01673b726a15f3cd2068fb3e` (ACCEPTED)
- **Deployer/Creator wallet**: `0x3958A649b41cd7C8561F4233cC0F5b0469Bc98E0` (private key stored locally, not in repo)
- **Adversary wallet**: `0x99bF44395CaC814E671ADFF8b69d968Fac4e5Db3` (private key stored locally, not in repo)
- **Execution script**: `scripts/test_all_methods.py`
- **Lint/Validation**: `genvm-lint check contracts/huntlayer.py` — PASSED (lint + validation, schema OK)

## Results Summary
| Category | Count | Result |
|---|---:|---|
| Positive methods/flows | 13+ | ✅ Succeeded (ACCEPTED, MAJORITY_AGREE) |
| Negative/adversarial scenarios | 6 | ✅ Rejected as expected |

## Positive Transaction Evidence (Happy Path)

| # | Method / Scenario | Tx Hash | Status | Notes |
|---|---|---|---|---|
| 1 | `create_bounty` (payable, 1 GEN, deadline 2099-12-31) | `0xbcb2d291f0ac08080291485220962774fba5e870e6ab5f9bd5d8e0f7509c33a1` | ACCEPTED / MAJORITY_AGREE | Bounty `bounty_0` created, pool 1e18 |
| 2 | `fund_bounty` (+0.5 GEN) | `0xf67d01929cadb8c821faebd5bbd175c2e0fe6b16a80e29a151a7b9212bfdd452` | ACCEPTED | Pool became 1.5e18 |
| 3 | `submit_pr` (open PR, not merged) | `0x3e58d6030d5f93d515d40865a201908e19aa2c6f9f55c83b4ed09494bbbdf32f` | ACCEPTED | Submission `sub_0` recorded |
| 4 | `evaluate_severity` (AI consensus + web) | `0x14fcecf5f27ba6951b445e0067bc4143203f7feabc5d4530991e02619880df8e` | ACCEPTED | Severity `low`, confidence `100` |
| 5 | `reopen_evaluation` (creator) | `0xeb9eaef78c5d422439cf2cdcad960073b375d245e7179ec177c9dd2bde96960b` | ACCEPTED | Evaluation reset (evaluated=False) |
| 6 | `evaluate_severity` (re-eval) | `0x880a051642290a3536d912ba962a35fc687cdfed4ce67a79e6de529d00e532fd` | ACCEPTED | Re-evaluation succeeded |
| 7 | `create_bounty` (bounty_1) | `0xe76e6b6fad639fd89902e19c37ecd231bc38c749495e0ba121f3a1146a35d9af` | ACCEPTED | Second bounty created |
| 8 | `close_if_expired` (not expired, no-op) | `0x9b4cb0e3470d10556ac07d6e4d65fc73d958b1263650186e38e2cc8e57a165d3` | ACCEPTED | Status remained `open` |
| 9 | `close_bounty` (creator) | `0x8ac3541f31d7a433ed8178219f9da77ce6a8ff18e4e714e8754ed2a17deaa5a3` | ACCEPTED | Status `closed` |
| 10 | `create_bounty` (bounty_2, for merged PR) | `0xcd8d911ce2a5d9cf43bceb851844adff651b87248c2493c7ce3c5f1fc8f2d46f` | ACCEPTED | Third bounty created |
| 11 | `submit_pr` (merged PR: `octocat/Spoon-Knife#3`) | `0x403c8e561b42ddeef97f090a945976f5d37b16b9ecb9be27a73c59081df1dd71` | ACCEPTED | Submission for an already-merged PR |
| 12 | `evaluate_severity` (merged PR) | `0x629bc66745e532dfb99bade53f890fa0944f57fc0210b3b66ccf9b9842e35ddf` | ACCEPTED | Severity set by consensus |
| 13 | `release_bounty` (merged PR) | `0x4adc6460f7c6aa543b86f4a63b4569b63d0c54a4f063c7cf021a9460067700d6` | ACCEPTED | **Paid**, status `paid`, pool decreased, reputation updated |

**View methods (read, verified):** `get_bounty`, `get_submissions`, `get_reputation`, `get_contributor_stats` — returned consistent data (reputation 1, merges 1, total_earned 1).

## Negative / Adversarial Transaction Evidence (Rejected)

All transactions below reached consensus but resulted in **execution ERROR** with `[EXPECTED] ...` payloads (state unchanged), as designed.

| # | Scenario | Actor | Tx Hash | Payload / Reason |
|---|---|---|---|---|
| N1 | `release_bounty` when PR is not merged | Creator | `0x813516d95007ea4ea8017080f2e2bef3240832253e542e17dba58fa7ad2b87a2` | `[EXPECTED] PR not merged yet` |
| N2 | `close_bounty` by non-creator | Adversary wallet | `0xa5445d8594c3d70ae3cbf48d9c07b680fac1906ee91169fa9bea906da5e7bc36` | `[EXPECTED] only creator can close` |
| N3 | `reopen_evaluation` by non-creator | Adversary wallet | `0xc8b118275ffbb5b5d8c5eb8b828742ea00eb07c3279db386593f46a216805037` | `[EXPECTED] only creator` |
| N4 | Duplicate `submit_pr` (same PR reused) | Creator | `0x16fa7bc545865e3862e23c40593d587c238d1ebf98271f94fb110f10995169ba` | `[EXPECTED] PR already submitted` |
| N5 | `submit_pr` after bounty is closed | Creator | `0xd915e591064bbd0c85947f4a4d411f10eaa38a5de3df4e0e0a92034027031ab1` | `[EXPECTED] bounty is closed` |

## Security & Accuracy Notes
- **AI consensus**: severity is determined via non-deterministic LLM+web with independent validators, field comparison (severity) and confidence tolerance (±15), and a gate requiring high confidence for `critical`.
- **Anti-manipulation**: creator-only controls, duplicate PR prevention, merge verification before release, pool sufficiency checks.
- **Limitations**: accuracy is not 100% (depends on prompts/sources/validators), but leader-validator consensus and appeal/finality mechanisms reduce single-node hallucination/manipulation risk.

## Reproduction
```bash
# deploy and run with funded Studionet wallets (keys provided via env vars, never committed)
export CREATOR_KEY=...
export ADVERSARY_KEY=...
python scripts/test_all_methods.py

# or integration tests
gltest test/test_huntlayer.py -v -s --network studionet
```

*This document summarizes verified on-chain Studionet transactions.* 
