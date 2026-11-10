import os
import time
from eth_account import Account
from genlayer_py.client import create_client
from genlayer_py.chains import studionet

ADDR = os.environ.get("HUNTLAYER_CONTRACT", "0xFDb3D1289B25934A2857113EFF67fD779BDd9F84")
KEY = os.environ["CREATOR_KEY"]
account = Account.from_key(KEY)
client = create_client(chain=studionet, account=account)

def wait(tx_hash):
    r = client.wait_for_transaction_receipt(tx_hash)
    print("receipt status:", r.get("status"), r.get("status_name"))
    return r

# create bounty
h = client.write_contract(ADDR, "create_bounty", args=["B","d","octocat/Hello-World",1,1,1,1,""], value=10**18)
print("create tx:", h)
wait(h)

# read bounty
print("bounty:", client.read_contract(ADDR, "get_bounty", args=["bounty_0"]))

# submit PR
pr = "https://github.com/octocat/Hello-World/pull/1"
h = client.write_contract(ADDR, "submit_pr", args=["bounty_0", pr, ""])
print("submit tx:", h)
wait(h)

subs = client.read_contract(ADDR, "get_submissions", args=["bounty_0"])
print("subs:", subs)
sid = list(subs.keys())[0]

# evaluate
h = client.write_contract(ADDR, "evaluate_severity", args=["bounty_0", sid, ""])
print("eval tx:", h)
wait(h)
print("after eval:", client.read_contract(ADDR, "get_submissions", args=["bounty_0"])[sid])

# fund_bounty
h = client.write_contract(ADDR, "fund_bounty", args=["bounty_0"], value=5*10**17)
print("fund tx:", h)
wait(h)
print("pool after fund:", client.read_contract(ADDR, "get_bounty", args=["bounty_0"])["pool"])

# reopen_evaluation by creator
h = client.write_contract(ADDR, "reopen_evaluation", args=["bounty_0", sid])
print("reopen tx:", h)
wait(h)
print("after reopen evaluated:", client.read_contract(ADDR, "get_submissions", args=["bounty_0"])[sid]["evaluated"])

# re-evaluate
h = client.write_contract(ADDR, "evaluate_severity", args=["bounty_0", sid, ""])
print("re-eval tx:", h)
wait(h)

# release (PR not merged -> should fail)
try:
    h = client.write_contract(ADDR, "release_bounty", args=["bounty_0", sid, ""])
    print("release tx:", h)
    wait(h)
    print("release succeeded (unexpected)")
except Exception as e:
    print("release rejected as expected:", str(e)[:120])

# close bounty
h = client.write_contract(ADDR, "close_bounty", args=["bounty_0"])
print("close tx:", h)
wait(h)
print("status:", client.read_contract(ADDR, "get_bounty", args=["bounty_0"])["status"])

# submit after close -> should fail
try:
    h = client.write_contract(ADDR, "submit_pr", args=["bounty_0", "https://github.com/octocat/Hello-World/pull/2", ""])
    print("submit after close tx:", h)
    wait(h)
    print("submit after close succeeded (unexpected)")
except Exception as e:
    print("submit after close rejected as expected:", str(e)[:120])

# contributor stats
print("stats:", client.read_contract(ADDR, "get_contributor_stats", args=["0x3958A649b41cd7C8561F4233cC0F5b0469Bc98E0"]))
print("reputation:", client.read_contract(ADDR, "get_reputation", args=["0x3958A649b41cd7C8561F4233cC0F5b0469Bc98E0"]))
print("DONE")