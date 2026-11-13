import os
import pytest
from eth_account import Account
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded, tx_execution_failed

CREATOR_KEY = os.environ.get("CREATOR_KEY")
creator = Account.from_key(CREATOR_KEY) if CREATOR_KEY else None

@pytest.fixture(autouse=True)
def _require_key():
    if not creator:
        pytest.skip("CREATOR_KEY env var required for studionet integration tests")

PR_URL = "https://github.com/octocat/Hello-World/pull/1"


def deploy_contract():
    factory = get_contract_factory("HuntLayer")
    contract = factory.deploy(args=[], account=creator)
    return contract


def test_create_bounty():
    contract = deploy_contract()

    tx = contract.create_bounty(
        args=["Fix login bug", "Users cannot log in", "octocat/Hello-World", 10, 5, 2, 1],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    bounty = contract.get_bounty(args=["bounty_0"]).call()
    assert bounty["title"] == "Fix login bug"
    assert bounty["status"] == "open"
    assert bounty["total_funded"] == 10**18


def test_submit_and_evaluate_requires_identity_proof():
    contract = deploy_contract()

    tx = contract.create_bounty(
        args=["Fix login bug", "Users cannot log in", "octocat/Hello-World", 10, 5, 2, 1],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    sub_tx = contract.submit_pr(args=["bounty_0", PR_URL]).transact()
    assert tx_execution_succeeded(sub_tx)

    subs = contract.get_submissions(args=["bounty_0"]).call()
    assert len(subs) == 1
    submission_id = list(subs.keys())[0]

    # external PR does not contain claiming wallet proof -> evaluation must fail
    eval_tx = contract.evaluate_severity(args=["bounty_0", submission_id]).transact()
    assert tx_execution_failed(eval_tx)

    subs = contract.get_submissions(args=["bounty_0"]).call()
    sub = subs[submission_id]
    assert sub["evaluated"] is False


MERGED_PR_URL = "https://github.com/octocat/Spoon-Knife/pull/3"


def test_release_on_merge_requires_identity_proof():
    contract = deploy_contract()

    tx = contract.create_bounty(
        args=["Fix docs", "Update readme", "octocat/Spoon-Knife", 10, 5, 2, 1, "2099-12-31"],
    ).transact(value=10**18)
    assert tx_execution_succeeded(tx)

    sub_tx = contract.submit_pr(args=["bounty_0", MERGED_PR_URL]).transact()
    assert tx_execution_succeeded(sub_tx)

    subs = contract.get_submissions(args=["bounty_0"]).call()
    submission_id = list(subs.keys())[0]

    # merged external PR still requires claiming-wallet identity proof
    eval_tx = contract.evaluate_severity(args=["bounty_0", submission_id]).transact()
    assert tx_execution_failed(eval_tx)
