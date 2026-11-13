# HuntLayer — Test Evidence (Studionet)

Documentation of **real on-chain execution on GenLayer Studionet** (not mocked), using funded Studionet wallets (kept private, not in repo).

## Latest Deployment (current frontend target, steward-corrected)

- **Network:** GenLayer Studionet
- **Contract:** `0x1f9572829502f3D545Bbe79860D026aA607d8553`
- **Deploy tx:** `0xc720d4c75b010d26e84a55e375242690540748193c4587940046bfe858eeef4d` (**ACCEPTED**)
- **Fixes:** (1) require proof that claiming wallet controls PR/contributor identity (wallet address must appear in PR/commits, checked during evaluate/release), (2) reserve applicable rewards so creators cannot withdraw reserved pool while submissions are pending or evaluated-unpaid, (3) evaluate against bounty stated defect and report patch/file omissions explicitly (no silent truncation).

### Steward-fix on-chain evidence (real Studionet)

See [`STEWARD_FIX_EVIDENCE.json`](./STEWARD_FIX_EVIDENCE.json).

| Scenario | Tx | Outcome |
|---|---|---|
| Create bounty (reserve case) | `0xfdd711787483548dcb1b5beb8819302c5f20770eab1de42d940fe54dd658c870` | ACCEPTED |
| Submit PR (pending) | `0x2bbcb2d15f2e21cc73b9a4e9b2d7ce1680c36ae3ec9cfaa577e0d0bc27136fcb` | ACCEPTED (max reward reserved) |
| Close bounty | `0x6c3fb9f9cd491f6d304981cc9f3b1c365b9091597ba427814fa2ce5ecc5bef7d` | ACCEPTED |
| Withdraw while pending (reserved) | `0x63e68e9dfa079e12585ddbab33bd0003d151f17dbfd26a2185f5585a872abb7a` | **ERROR (expected)** `[EXPECTED] no withdrawable funds (rewards reserved for pending/evaluated submissions)` |
| Create bounty (claim-theft case) | `0x8953a5d6dbeca192948722178c06603960e29abb694b56679918df34ee8ba2b1` | ACCEPTED |
| Adversary submits PR (no identity proof) | `0x89e077a6b2df8cb6201192cd884638b625aced3d7e3c2b2e0ceca9becdb590aa` | ACCEPTED (submission recorded) |
| Adversary evaluates (claim theft attempt) | `0x6239bcb5c3fd571d9d08ce38334b0f51a98284e130298f47eb86e1c2bfb5ea53` | **ERROR (expected)** `[EXPECTED] missing proof: PR/commits must include claiming wallet address 0x99bF44395CaC814E671ADFF8b69d968Fac4e5Db3` |

**Large defect-specific PR / no silent truncation (implementation):** `evaluate_severity` includes bounty stated defect (title/description) in the consensus prompt, includes file statuses/counts (up to 50 files), expands patch context (4k chars/file), and marks omissions explicitly (`[TRUNCATED: patch exceeded 4000 chars; material content omitted]`, `[TRUNCATED: showing 50 of N changed files; remaining files omitted]`, `[NO PATCH PROVIDED BY API FOR THIS FILE]`) instead of silent truncation. End-to-end positive evaluation on an external PR additionally requires the claiming wallet address to be present in that PR/commits (identity proof).

## Previous Deployment (public listing)

- **Network:** GenLayer Studionet
- **Contract:** `0x3965DdBb9D61475Dc98d506714a6243AE3d55AeE`
- **Deploy tx:** `0xf84a77c9311955a5b8fdb939eac41515bf308552b83f8687c0c78cf94d194521` (**ACCEPTED**)
- **Change:** adds `get_bounty_count()` view to support public bounty listing in the Explore UI.
- **Smoke check:** `get_bounty_count()` → `0` on fresh deployment.

## Tested Deployment (improved contract, real on-chain runs)

- **Network:** GenLayer Studionet
- **Contract:** `0x8Cb7c556768aB3A72cfa7c8e4b488c09f63714c2`
- **Deploy tx:** `0x58da5bd6efecc2ec2805dfe86e97635dac7fa14bb09be185b0f3200b7dd3043a` (**ACCEPTED**)
- **Deployer/Creator wallet:** `0x3958A649b41cd7C8561F4233cC0F5b0469Bc98E0`
- **Adversary wallet:** `0x99bF44395CaC814E671ADFF8b69d968Fac4e5Db3`
- **Contract source:** `contracts/huntlayer.py` (improved ABI/behavior: `withdraw_pool`, PR-to-repo binding, removed untrusted `current_date`/`close_if_expired`, stricter frontend finalization checks)

## Lint / Validation

- **Command:** `genvm-lint check contracts/huntlayer.py --json`
- **Result:** ✅ `ok: true` (lint 3/3, validate ok) — contract `HuntLayer`, 12 methods (4 view, 8 write)
- **Warning (informational):** newer runner available than pinned `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (pin retained)

## Real On-Chain Method Tests (Studionet)

Executed against the current contract with real wallets (`scripts/test_all_methods.py` flow + completion of merged-PR path). All listed transactions reached consensus; rows marked **ERROR (expected)** are intentional adversarial rejections (state/guards enforced).

| # | Method / Scenario | Tx Hash | Result | Notes |
|---|---|---|---|---|
| 1 | `create_bounty` (payable, 1 GEN, `octocat/Hello-World`, deadline 2099-12-31) | `0x0b20fe1344f566a166be7671a3d57f9f5fd4f98995310eb03ee3a41aadcb1ff8` | ACCEPTED / MAJORITY_AGREE | `bounty_0` created (pool 1.5e18 after fund path) |
| 2 | `fund_bounty` (+0.5 GEN) | `0xe0773d5e96a9ca7d718700778db8af6a74bf8b7760d2e47de15ad4095490d3ab` | ACCEPTED | Pool increased (2.0e18) |
| 3 | `submit_pr` (open PR) | `0x36bb1d1c652518149aefc0ef884c53fd9dbd0dee8b37fbd7c361cee779c92d1f` | ACCEPTED | `sub_0` submitted (repo-bound) |
| 4 | `evaluate_severity` (AI consensus + web) | `0x675f948710344e0e08405eac604a3905e88b891a35a401730da65e232c83b39e` | ACCEPTED | Severity `low`, confidence `98` |
| 5 | `reopen_evaluation` (creator) | `0xfb119f4409543d7664a9b6dc15f04a2db1037d545e35bb1510372590d0e7576a` | ACCEPTED | Evaluation reset |
| 6 | `evaluate_severity` (re-eval) | `0x6f283fbfbcae37b2953867e161449f93be0a9ce13a85d3846f9b22087e15f7c8` | ACCEPTED | Re-evaluated |
| 7 | `release_bounty` (PR not merged) | `0x0452919ddf37a7b88fce29cf8eb8ecb6f2553a96fab283b4f25d5fdf6a04469c` | **ERROR (expected)** | `[EXPECTED] PR not merged yet` |
| 8 | `close_bounty` by non-creator | `0xa141af4398acc0d7ffd45a2c2d10d3b35c19742600fc044b9ad60e7cacee71bb` | **ERROR (expected)** | `[EXPECTED] only creator can close` |
| 9 | `reopen_evaluation` by non-creator | `0xfe2754306fce1664797497df05056d394a46767df57ae43862ea3e2b44ef0ea3` | **ERROR (expected)** | `[EXPECTED] only creator` |
| 10 | `create_bounty` (bounty_1) | `0x35d8e1b146cb8f07c84e045bd0fd9e78bd80a8c831f7e3d5138a1cb079aad7be` | ACCEPTED | Second bounty created |
| 11 | Duplicate `submit_pr` (same PR reused) | `0xe499d5390eeb02c6515c3aaa161d6183d5831e552b98595ea04518671936554b` | **ERROR (expected)** | `[EXPECTED] PR already submitted` |
| 12 | `close_bounty` (creator) | `0xd090a8422afaf8348166d906486d555e18642fe461a3a0ad948b2233eef8fb8e` | ACCEPTED | `bounty_1` closed |
| 13 | `withdraw_pool` (creator, after close) | `0x08d1e8ddd6b0e187a4c0c8324002358fde4d60f68a70d057e17975d20d5bde34` | ACCEPTED | Remaining pool withdrawn (pool → 0) |
| 14 | `submit_pr` after close | `0xf6a36f4d0005c73a40a1ccaefca92f4a659ffb2e7a14e1cff286d26d63ea544a` | **ERROR (expected)** | `[EXPECTED] bounty is closed` |
| 15 | `create_bounty` (tx returned `bounty_4`) | `0xac21ad8de725123743213dbf13f409ac2d749e32c961fbc3386057b62ac3b18b` | ACCEPTED | Additional bounty created during run |
| 16 | `submit_pr` with PR repo mismatch (script-state case) | `0xdfea19dfcff6ccf6f13941fbae441b2099e012eb14045ed76a2207761410ed6c` | **ERROR (expected)** | `[EXPECTED] PR repo does not match bounty repo` (repo-binding enforced) |
| 17 | `create_bounty` for merged-PR flow (`bounty_5`, `octocat/Spoon-Knife`) | `0x68fa01d53486e3548e9dc62d42e6e69d67ce97cf35f9ecdb9f6661818546b6f6` | ACCEPTED | Bounty for merged PR |
| 18 | `submit_pr` (merged PR `octocat/Spoon-Knife#3`) | `0x2c4559d2d06a890ec898f721f5d672867f4788cf0cf0990da6ec2ef749c42bb8` | ACCEPTED | `sub_1` submitted |
| 19 | `evaluate_severity` (merged PR) | `0x7ea197efd2687c0165afc725cc7e33d6d63fd28bfa523e5d1ba83d6642002243` | ACCEPTED | Severity `low`, confidence `98` |
| 20 | `release_bounty` (merged PR) | `0xc8ff2cc6d128f7a2f39079432c44fa0f85424fe61f8392b5f256539044c2dfc9` | ACCEPTED | **Paid**, pool decreased, reputation/stats updated (`merges:1`, `reputation:1`, `total_earned:1`) |

**Views verified:** `get_bounty`, `get_submissions`, `get_reputation`, `get_contributor_stats` returned consistent on-chain state during the run.

## Integration & Adversarial Tests (gltest, real Studionet)

- **Command:** `gltest test/test_huntlayer.py test/test_adversarial.py -v -s --network studionet`
- **Result:** ✅ **9 passed** in 436.64s (0:07:16)
  - `test_huntlayer.py::test_create_bounty` — PASSED
  - `test_huntlayer.py::test_submit_and_evaluate` — PASSED
  - `test_huntlayer.py::test_release_on_merge` — PASSED
  - `test_adversarial.py::test_non_creator_cannot_close` — PASSED
  - `test_adversarial.py::test_duplicate_pr_rejected` — PASSED
  - `test_adversarial.py::test_release_before_merge_rejected` — PASSED
  - `test_adversarial.py::test_pr_repo_must_match_bounty` — PASSED
  - `test_adversarial.py::test_withdraw_pool_by_creator_after_close` — PASSED
  - `test_adversarial.py::test_non_creator_cannot_withdraw_and_must_be_closed` — PASSED

## Notes

- **Consensus/AI:** severity/merge checks are consensus-verified from fetched PR evidence; results are probabilistic but bounded by validator comparison, confidence tolerance/gating, and merge/pool/permission checks.
- **Safety improvements covered:** PR-to-repo binding, no untrusted caller-supplied date enforcement, creator-only close/reopen/withdraw, duplicate PR prevention, payout idempotency, and remaining-pool recovery after close.
- **Script note:** an intermediate method-test step hit a repo-mismatch (correctly rejected on-chain) due to run-state/script ordering; the merged-PR release path was completed successfully in the follow-up transactions above (bounty_5/sub_1).

---

## Historical Evidence (previous deployment)

- **Contract:** `0x829068c07fDe9f71f5b41b3ef5423A141Ea46beF` (old ABI/signatures)
- **Deploy tx:** `0x3da22d38844b411022fbc5801ab98cda8c26ec1d01673b726a15f3cd2068fb3e`
- Prior on-chain positive/negative runs and tx hashes for that deployment were recorded before the contract improvements (e.g. before `withdraw_pool`, repo binding, and removal of `current_date`/`close_if_expired`). Refer to repository history for the earlier evidence snapshot.

## Follow-up correction: large-PR pagination & tests (latest)

- **Corrected contract (latest):** `0x0A947e67e958fcD18d2F7E9529dbF6af75296ef4`
- **Deploy tx:** `0x5d247fb6360bb798038f6afa7e00c2bc6489cc6a53a8b835e7c71f50aabb4382` (**ACCEPTED**, Studionet)
- **Fix:** `evaluate_severity` now paginates GitHub PR files (`/files?per_page=100&page=n`, up to safety cap) and commits instead of using a single unpaginated files response; if later files/pages cannot be fully fetched or are omitted from prompt, explicit omission markers are added (no silent omission), while still evaluating against the bounty's stated defect.
- **Large defect-specific PR tests (direct mode, paginated/mocked):** `test/direct/test_large_pr.py`
  - `test_large_defect_specific_pr_paginates_files_and_evaluates` — 120-file PR across 2 pages with identity proof and stated defect; evaluation succeeds (high/90).
  - `test_large_pr_beyond_fetch_cap_marks_omission_and_evaluates` — PR exceeding fetch-page safety cap; evaluation proceeds with explicit omission marker (no silent omission), defect-specific result.
- **Result:** `python -m pytest test/direct/test_large_pr.py -v` → **2 passed** (0.18s). `genvm-lint check contracts/huntlayer.py --json` → OK.
