import json
import os
from eth_account import Account
from genlayer_py.client import create_client
from genlayer_py.chains import studionet

ADDR = os.environ.get("HUNTLAYER_CONTRACT", "0x829068c07fDe9f71f5b41b3ef5423A141Ea46beF")
CREATOR_KEY = os.environ["CREATOR_KEY"]  # set to your funded Studionet wallet private key
ADVERSARY_KEY = os.environ["ADVERSARY_KEY"]  # set to adversary wallet private key

creator = Account.from_key(CREATOR_KEY)
adversary = Account.from_key(ADVERSARY_KEY)
client = create_client(chain=studionet, account=creator)
adv_client = create_client(chain=studionet, account=adversary)

PR_OPEN = "https://github.com/octocat/Hello-World/pull/1"      # not merged
PR_MERGED = "https://github.com/octocat/Spoon-Knife/pull/3"    # merged

def wait(tx_hash, label):
    r = client.wait_for_transaction_receipt(tx_hash)
    status = r.get("status_name") or r.get("status")
    res = r.get("result_name")
    print(f"[{label}] tx={tx_hash} status={status} result={res}")
    return r

def write(c, addr, method, args=None, value=0, label=""):
    h = c.write_contract(addr, method, args=args or [], value=value)
    return wait(h, label or method)

def expect_fail(c, addr, method, args=None, label=""):
    try:
        h = c.write_contract(addr, method, args=args or [])
        r = wait(h, label or method)
        # check execution failed in receipt
        leader = (r.get("consensus_data") or {}).get("leader_receipt") or []
        if leader and leader[0].get("execution_result") == "ERROR":
            print(f"[{label}] rejected as expected: {leader[0].get('result',{}).get('payload')}")
            return True
        print(f"[{label}] UNEXPECTED success-ish receipt")
        return False
    except Exception as e:
        print(f"[{label}] rejected with exception: {e}")
        return True

print("=== Deploy target ===", ADDR)

# 1. create_bounty (payable)
write(client, ADDR, "create_bounty", ["Bounty1","desc","octocat/Hello-World",10,5,2,1,"2099-12-31"], value=10**18, label="create_bounty")
b = client.read_contract(ADDR, "get_bounty", args=["bounty_0"])
print("get_bounty:", json.dumps(b))

# 2. fund_bounty
write(client, ADDR, "fund_bounty", ["bounty_0"], value=5*10**17, label="fund_bounty")
print("pool after fund:", client.read_contract(ADDR, "get_bounty", args=["bounty_0"])["pool"])

# 3. submit_pr
write(client, ADDR, "submit_pr", ["bounty_0", PR_OPEN], label="submit_pr")
subs = client.read_contract(ADDR, "get_submissions", args=["bounty_0"])
sid = list(subs.keys())[0]
print("get_submissions:", json.dumps(subs[sid]))

# 4. evaluate_severity
write(client, ADDR, "evaluate_severity", ["bounty_0", sid], label="evaluate_severity")
subs = client.read_contract(ADDR, "get_submissions", args=["bounty_0"])
print("after eval confidence:", subs[sid].get("confidence"), "severity:", subs[sid].get("severity"))

# 5. reopen_evaluation
write(client, ADDR, "reopen_evaluation", ["bounty_0", sid], label="reopen_evaluation")
print("after reopen evaluated:", client.read_contract(ADDR, "get_submissions", args=["bounty_0"])[sid]["evaluated"])

# re-evaluate for release attempt
write(client, ADDR, "evaluate_severity", ["bounty_0", sid], label="re-evaluate")

# 6. release_bounty should fail (PR not merged)
expect_fail(client, ADDR, "release_bounty", ["bounty_0", sid], label="release_unmerged_should_fail")

# 7. adversarial: non-creator close/reopen
expect_fail(adv_client, ADDR, "close_bounty", ["bounty_0"], label="adv_close_should_fail")
expect_fail(adv_client, ADDR, "reopen_evaluation", ["bounty_0", sid], label="adv_reopen_should_fail")

# 8. duplicate PR rejection
write(client, ADDR, "create_bounty", ["Bounty2","d","octocat/Hello-World",1,1,1,1,""], value=10**18, label="create_bounty_2")
expect_fail(client, ADDR, "submit_pr", ["bounty_1", PR_OPEN], label="duplicate_pr_should_fail")

# 9. close_bounty by creator
write(client, ADDR, "close_bounty", ["bounty_1"], label="close_bounty")
print("bounty_1 closed:", client.read_contract(ADDR, "get_bounty", args=["bounty_1"])["status"])

# 10. withdraw_pool by creator (leftover funds)
write(client, ADDR, "withdraw_pool", ["bounty_1"], label="withdraw_pool")
print("bounty_1 pool after withdraw:", client.read_contract(ADDR, "get_bounty", args=["bounty_1"])["pool"])

# 11. submit after close rejected
expect_fail(client, ADDR, "submit_pr", ["bounty_1", "https://github.com/octocat/Hello-World/pull/2"], label="submit_after_close_should_fail")

# 12. release on merged PR path (new bounty)
write(client, ADDR, "create_bounty", ["Bounty3","d","octocat/Spoon-Knife",10,5,2,1,"2099-12-31"], value=10**18, label="create_bounty_3")
write(client, ADDR, "submit_pr", ["bounty_2", PR_MERGED], label="submit_pr_merged")
subs3 = client.read_contract(ADDR, "get_submissions", args=["bounty_2"])
sid3 = list(subs3.keys())[0]
write(client, ADDR, "evaluate_severity", ["bounty_2", sid3], label="evaluate_merged")
write(client, ADDR, "release_bounty", ["bounty_2", sid3], label="release_bounty_merged")
subs3 = client.read_contract(ADDR, "get_submissions", args=["bounty_2"])
print("merged paid:", subs3[sid3]["paid"], "status:", subs3[sid3]["status"])

# 13. views: reputation & stats
rep = client.read_contract(ADDR, "get_reputation", args=[creator.address])
stats = client.read_contract(ADDR, "get_contributor_stats", args=[creator.address])
print("get_reputation:", rep)
print("get_contributor_stats:", json.dumps(stats))

print("=== ALL DONE ===")
