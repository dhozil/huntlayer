import os
import pytest
from eth_account import Account
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded, tx_execution_failed

ADVERSARY_KEY = os.environ.get("ADVERSARY_KEY")
adversary = Account.from_key(ADVERSARY_KEY) if ADVERSARY_KEY else None

@pytest.fixture(autouse=True)
def _require_key():
    if not adversary:
        pytest.skip("ADVERSARY_KEY env var required for adversarial tests")


def deploy_contract():
    factory = get_contract_factory("HuntLayer")
    contract = factory.deploy(args=[])
    return contract


def test_non_creator_cannot_close():
    contract = deploy_contract()
    tx = contract.create_bounty(
        args=["B", "d", "octocat/Hello-World", 1, 1, 1, 1, ""],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    # adversary tries to close
    contract2 = contract.connect(adversary)
    bad_tx = contract2.close_bounty(args=["bounty_0"]).transact()
    assert tx_execution_failed(bad_tx)


def test_duplicate_pr_rejected():
    contract = deploy_contract()
    tx = contract.create_bounty(
        args=["B", "d", "octocat/Hello-World", 1, 1, 1, 1, ""],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    pr = "https://github.com/octocat/Hello-World/pull/1"
    t1 = contract.submit_pr(args=["bounty_0", pr]).transact()
    assert tx_execution_succeeded(t1)

    # second bounty
    tx2 = contract.create_bounty(
        args=["B2", "d2", "octocat/Hello-World", 1, 1, 1, 1, ""],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx2)

    dup = contract.submit_pr(args=["bounty_1", pr]).transact()
    assert tx_execution_failed(dup)


def test_release_before_merge_rejected_without_identity_proof():
    contract = deploy_contract()
    tx = contract.create_bounty(
        args=["B", "d", "octocat/Hello-World", 1, 1, 1, 1, ""],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    pr = "https://github.com/octocat/Hello-World/pull/1"  # no claiming-wallet proof in PR/commits
    t1 = contract.submit_pr(args=["bounty_0", pr]).transact()
    assert tx_execution_succeeded(t1)
    subs = contract.get_submissions(args=["bounty_0"]).call()
    sid = list(subs.keys())[0]
    et = contract.evaluate_severity(args=["bounty_0", sid]).transact()
    assert tx_execution_failed(et)


def test_pr_repo_must_match_bounty():
    contract = deploy_contract()
    tx = contract.create_bounty(
        args=["B", "d", "octocat/Spoon-Knife", 1, 1, 1, 1, ""],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    bad = contract.submit_pr(args=["bounty_0", "https://github.com/octocat/Hello-World/pull/1"]).transact()
    assert tx_execution_failed(bad)


def test_withdraw_pool_by_creator_after_close():
    contract = deploy_contract()
    tx = contract.create_bounty(
        args=["B", "d", "octocat/Hello-World", 1, 1, 1, 1, ""],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    close = contract.close_bounty(args=["bounty_0"]).transact()
    assert tx_execution_succeeded(close)

    wd = contract.withdraw_pool(args=["bounty_0"]).transact()
    assert tx_execution_succeeded(wd)

    bounty = contract.get_bounty(args=["bounty_0"]).call()
    assert bounty["pool"] == 0
    assert bounty["status"] == "closed"


def test_non_creator_cannot_withdraw_and_must_be_closed():
    contract = deploy_contract()
    tx = contract.create_bounty(
        args=["B", "d", "octocat/Hello-World", 1, 1, 1, 1, ""],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    # cannot withdraw while open
    wd_open = contract.withdraw_pool(args=["bounty_0"]).transact()
    assert tx_execution_failed(wd_open)

    contract.close_bounty(args=["bounty_0"]).transact()
    contract2 = contract.connect(adversary)
    wd_bad = contract2.withdraw_pool(args=["bounty_0"]).transact()
    assert tx_execution_failed(wd_bad)


def test_creator_cannot_withdraw_reserved_for_pending_submission():
    # pool withdrawal must reserve applicable reward while submission is pending
    contract = deploy_contract()
    # rewards: critical/high/medium/low; max reward = 10
    tx = contract.create_bounty(
        args=["B", "d", "octocat/Hello-World", 10, 5, 2, 1, ""],
    ).transact(value=10)
    assert tx_execution_succeeded(tx)

    # pending submission reserves max possible reward (10)
    pr = "https://github.com/octocat/Hello-World/pull/1"
    t1 = contract.submit_pr(args=["bounty_0", pr]).transact()
    assert tx_execution_succeeded(t1)

    contract.close_bounty(args=["bounty_0"]).transact()
    wd = contract.withdraw_pool(args=["bounty_0"]).transact()
    assert tx_execution_failed(wd)

    bounty = contract.get_bounty(args=["bounty_0"]).call()
    assert bounty["pool"] == 10
    assert bounty["status"] == "closed"


def test_claim_theft_rejected_without_pr_identity_proof():
    # adversary cannot claim/evaluate a PR that does not prove control of claiming wallet
    contract = deploy_contract()
    tx = contract.create_bounty(
        args=["B", "d", "octocat/Hello-World", 1, 1, 1, 1, ""],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    pr = "https://github.com/octocat/Hello-World/pull/1"  # does not contain adversary address
    contract2 = contract.connect(adversary)
    t1 = contract2.submit_pr(args=["bounty_0", pr]).transact()
    assert tx_execution_succeeded(t1)
    subs = contract2.get_submissions(args=["bounty_0"]).call()
    sid = list(subs.keys())[0]

    et = contract2.evaluate_severity(args=["bounty_0", sid]).transact()
    assert tx_execution_failed(et)