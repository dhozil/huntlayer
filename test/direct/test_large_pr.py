import json


def _files_page(page: int, per_page: int, total: int):
    files = []
    start = (page - 1) * per_page
    end = min(start + per_page, total)
    for i in range(start, end):
        files.append({
            "filename": f"src/module_{i}.py",
            "status": "modified",
            "additions": 3,
            "deletions": 1,
            "patch": "@@ -1 +1,3 @@\n-unsafe_input()\n+# defect-specific fix: sanitize and validate input\n+safe_input()\n+# prevents the reported issue\n",
        })
    return files


def test_large_defect_specific_pr_paginates_files_and_evaluates(direct_vm, direct_deploy, direct_alice):
    """Covers steward request: large PR files are paginated (not single unpaginated fetch)
    so later files are included or explicitly marked; evaluation runs against stated defect."""
    contract = direct_deploy("contracts/huntlayer.py")

    # Create bounty with stated defect (evaluated against this)
    direct_vm.sender = direct_alice
    direct_vm.value = 10**18
    bounty_id = contract.create_bounty(
        "Fix reflected XSS in search",
        "Stated defect: search query parameter is rendered unsanitized causing reflected XSS.",
        "octocat/Hello-World",
        10**18,
        5 * 10**17,
        2 * 10**17,
        10**17,
        "2099-12-31",
    )
    direct_vm.value = 0

    pr_url = "https://github.com/octocat/Hello-World/pull/999"
    sub_id = contract.submit_pr(bounty_id, pr_url)
    subs = contract.get_submissions(bounty_id)
    researcher = subs[sub_id]["researcher"]

    # Large PR: 120 changed files across 2 pages (per_page=100)
    total_files = 120
    pr_obj = {
        "title": f"Fix XSS - claim {researcher}",
        "body": "Fixes the stated reflected XSS defect by sanitizing search input.",
        "user": {"login": "someone"},
        "merged": False,
    }
    commits_obj = [
        {"commit": {"message": f"sanitizes input for {researcher}"}}
    ]

    direct_vm.mock_web(r".*/pulls/999$", {"status": 200, "body": json.dumps(pr_obj)})
    direct_vm.mock_web(r".*/pulls/999/files\?per_page=100&page=1$", {"status": 200, "body": json.dumps(_files_page(1, 100, total_files))})
    direct_vm.mock_web(r".*/pulls/999/files\?per_page=100&page=2$", {"status": 200, "body": json.dumps(_files_page(2, 100, total_files))})
    direct_vm.mock_web(r".*/pulls/999/commits\?per_page=100&page=1$", {"status": 200, "body": json.dumps(commits_obj)})

    # LLM returns defect-specific evaluation
    direct_vm.mock_llm(r".*stated defect.*", json.dumps({
        "severity": "high",
        "confidence": 90,
        "reasoning": "PR addresses the stated reflected XSS defect by sanitizing/encoding search input across changed files."
    }))

    contract.evaluate_severity(bounty_id, sub_id)

    subs = contract.get_submissions(bounty_id)
    sub = subs[sub_id]
    assert sub["evaluated"] is True
    assert sub["severity"] == "high"
    assert sub["payout"] == 5 * 10**17
    assert sub["confidence"] == 90
    assert "stated" in sub["reasoning"].lower() or "xss" in sub["reasoning"].lower()


def test_large_pr_beyond_fetch_cap_marks_omission_and_evaluates(direct_vm, direct_deploy, direct_alice):
    """When PR has more file pages than safety cap, evaluation must still proceed with explicit omission marker (no silent omission)."""
    contract = direct_deploy("contracts/huntlayer.py")

    direct_vm.sender = direct_alice
    direct_vm.value = 10**18
    bounty_id = contract.create_bounty(
        "Fix auth bypass",
        "Stated defect: missing authorization check allows privilege escalation.",
        "octocat/Hello-World",
        10**18, 5 * 10**17, 2 * 10**17, 10**17, "2099-12-31",
    )
    direct_vm.value = 0

    pr_url = "https://github.com/octocat/Hello-World/pull/1000"
    sub_id = contract.submit_pr(bounty_id, pr_url)
    subs = contract.get_submissions(bounty_id)
    researcher = subs[sub_id]["researcher"]

    pr_obj = {
        "title": f"Fix authz - {researcher}",
        "body": "Addresses stated authorization defect.",
        "user": {"login": "someone"},
        "merged": False,
    }
    commits_obj = [{"commit": {"message": f"proof {researcher}"}}]

    direct_vm.mock_web(r".*/pulls/1000$", {"status": 200, "body": json.dumps(pr_obj)})
    # 10 full pages -> hits safety cap, files not fully fetched (marker must be added)
    for page in range(1, 11):
        direct_vm.mock_web(rf".*/pulls/1000/files\?per_page=100&page={page}$", {"status": 200, "body": json.dumps(_files_page(page, 100, 2000))})
    direct_vm.mock_web(r".*/pulls/1000/commits\?per_page=100&page=1$", {"status": 200, "body": json.dumps(commits_obj)})

    direct_vm.mock_llm(r".*stated defect.*", json.dumps({
        "severity": "critical",
        "confidence": 85,
        "reasoning": "Addresses stated auth bypass; evidence reviewed though some file pages were explicitly marked omitted."
    }))

    contract.evaluate_severity(bounty_id, sub_id)

    subs = contract.get_submissions(bounty_id)
    sub = subs[sub_id]
    assert sub["evaluated"] is True
    assert sub["severity"] == "critical"
    assert sub["confidence"] == 85
