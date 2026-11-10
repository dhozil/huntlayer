# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *


# Error classification prefixes (see Equivalence Principle docs)
ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"

SEVERITY_POINTS = {"critical": 10, "high": 5, "medium": 3, "low": 1}


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


@allow_storage
@dataclass
class Bounty:
    id: str
    creator: str
    title: str
    description: str
    repo: str
    reward_critical: u256
    reward_high: u256
    reward_medium: u256
    reward_low: u256
    status: str
    total_funded: u256
    deadline: str
    pool: u256


@allow_storage
@dataclass
class Submission:
    id: str
    bounty_id: str
    researcher: str
    pr_url: str
    severity: str
    reasoning: str
    confidence: u256
    payout: u256
    status: str
    evaluated: bool
    paid: bool


def _handle_leader_error(leaders_res, leader_fn) -> bool:
    leader_msg = leaders_res.message if hasattr(leaders_res, "message") else ""
    try:
        leader_fn()
        return False  # leader errored, validator succeeded -> disagree
    except gl.vm.UserError as e:
        validator_msg = e.message if hasattr(e, "message") else str(e)
        if validator_msg.startswith(ERROR_EXPECTED) or validator_msg.startswith(ERROR_EXTERNAL):
            return validator_msg == leader_msg
        if validator_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(ERROR_TRANSIENT):
            return True
        return False
    except Exception:
        return False


class HuntLayer(gl.Contract):
    bounties: TreeMap[str, Bounty]
    submissions: TreeMap[str, TreeMap[str, Submission]]
    reputation: TreeMap[Address, u256]
    merge_count: TreeMap[Address, u256]
    total_earned: TreeMap[Address, u256]
    submitted_prs: TreeMap[str, str]
    bounty_counter: u256
    submission_counter: u256

    def __init__(self):
        pass

    # ---------- helpers ----------

    def _parse_pr(self, pr_url: str):
        segments = pr_url.strip().rstrip("/").split("/")
        idx = None
        for i, s in enumerate(segments):
            if s in ("pull", "pulls"):
                idx = i
                break
        if idx is None or idx < 2 or idx + 1 >= len(segments):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} invalid PR url: {pr_url}")
        owner = segments[idx - 2]
        repo = segments[idx - 1]
        number = segments[idx + 1]
        return owner, repo, number

    def _reward_for(self, bounty: Bounty, severity: str) -> u256:
        if severity == "critical":
            return bounty.reward_critical
        if severity == "high":
            return bounty.reward_high
        if severity == "medium":
            return bounty.reward_medium
        return bounty.reward_low

    # ---------- bounty lifecycle ----------

    @gl.public.write.payable
    def create_bounty(
        self,
        title: str,
        description: str,
        repo: str,
        reward_critical: int,
        reward_high: int,
        reward_medium: int,
        reward_low: int,
        deadline: str = "",
    ) -> str:
        if gl.message.value == u256(0):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} bounty must be funded")
        bounty_id = f"bounty_{self.bounty_counter}"
        self.bounty_counter = self.bounty_counter + u256(1)
        bounty = Bounty(
            id=bounty_id,
            creator=gl.message.sender_address.as_hex,
            title=title,
            description=description,
            repo=repo,
            reward_critical=u256(reward_critical),
            reward_high=u256(reward_high),
            reward_medium=u256(reward_medium),
            reward_low=u256(reward_low),
            status="open",
            total_funded=gl.message.value,
            deadline=deadline,
            pool=gl.message.value,
        )
        self.bounties[bounty_id] = bounty
        return bounty_id

    @gl.public.write.payable
    def fund_bounty(self, bounty_id: str) -> None:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown bounty")
        bounty = self.bounties[bounty_id]
        if gl.message.value == u256(0):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} must send value")
        bounty.pool = bounty.pool + gl.message.value
        bounty.total_funded = bounty.total_funded + gl.message.value
        self.bounties[bounty_id] = bounty

    @gl.public.write
    def close_bounty(self, bounty_id: str) -> None:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown bounty")
        bounty = self.bounties[bounty_id]
        if gl.message.sender_address != Address(bounty.creator):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} only creator can close")
        bounty.status = "closed"
        self.bounties[bounty_id] = bounty

    @gl.public.write
    def close_if_expired(self, bounty_id: str, current_date: str) -> None:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown bounty")
        bounty = self.bounties[bounty_id]
        if bounty.status != "open":
            return
        if bounty.deadline and current_date > bounty.deadline:
            bounty.status = "closed"
            self.bounties[bounty_id] = bounty

    @gl.public.write
    def reopen_evaluation(self, bounty_id: str, submission_id: str) -> None:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown bounty")
        if bounty_id not in self.submissions or submission_id not in self.submissions[bounty_id]:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown submission")
        bounty = self.bounties[bounty_id]
        submission = self.submissions[bounty_id][submission_id]
        if submission.paid:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} already paid")
        if gl.message.sender_address != Address(bounty.creator):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} only creator")
        submission.evaluated = False
        submission.status = "submitted"
        submission.confidence = u256(0)
        self.submissions[bounty_id][submission_id] = submission

    @gl.public.write
    def submit_pr(self, bounty_id: str, pr_url: str, current_date: str = "") -> str:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown bounty")
        bounty = self.bounties[bounty_id]
        if bounty.status != "open":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} bounty is closed")
        if bounty.deadline and current_date and current_date > bounty.deadline:
            bounty.status = "closed"
            self.bounties[bounty_id] = bounty
            raise gl.vm.UserError(f"{ERROR_EXPECTED} bounty deadline passed")
        # anti-duplication: same PR cannot be reused across bounties
        if pr_url in self.submitted_prs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} PR already submitted")
        # validate PR url parses
        self._parse_pr(pr_url)

        submission_id = f"sub_{self.submission_counter}"
        self.submission_counter = self.submission_counter + u256(1)
        submission = Submission(
            id=submission_id,
            bounty_id=bounty_id,
            researcher=gl.message.sender_address.as_hex,
            pr_url=pr_url,
            severity="",
            reasoning="",
            confidence=u256(0),
            payout=u256(0),
            status="submitted",
            evaluated=False,
            paid=False,
        )
        self.submissions.get_or_insert_default(bounty_id)[submission_id] = submission
        self.submitted_prs[pr_url] = bounty_id
        return submission_id

    # ---------- severity evaluation ----------

    @gl.public.write
    def evaluate_severity(self, bounty_id: str, submission_id: str, current_date: str = "") -> None:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown bounty")
        if bounty_id not in self.submissions or submission_id not in self.submissions[bounty_id]:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown submission")
        submission = self.submissions[bounty_id][submission_id]
        if submission.evaluated:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} already evaluated")
        bounty = self.bounties[bounty_id]
        if bounty.status != "open":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} bounty closed")
        if bounty.deadline and current_date and current_date > bounty.deadline:
            bounty.status = "closed"
            self.bounties[bounty_id] = bounty
            raise gl.vm.UserError(f"{ERROR_EXPECTED} bounty deadline passed")

        owner, repo, number = self._parse_pr(submission.pr_url)
        api_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}"
        files_url = f"{api_url}/files"

        def leader_fn():
            res = gl.nondet.web.get(api_url)
            if res.status >= 500:
                raise gl.vm.UserError(f"{ERROR_TRANSIENT} GitHub API unavailable: {res.status}")
            if res.status >= 400:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} GitHub API error: {res.status}")
            body = res.body
            if isinstance(body, (bytes, bytearray)):
                body = body.decode("utf-8")
            pr = json.loads(body)

            fres = gl.nondet.web.get(files_url)
            if fres.status >= 500:
                raise gl.vm.UserError(f"{ERROR_TRANSIENT} GitHub files API unavailable: {fres.status}")
            if fres.status >= 400:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} GitHub files API error: {fres.status}")
            fbody = fres.body
            if isinstance(fbody, (bytes, bytearray)):
                fbody = fbody.decode("utf-8")
            files = json.loads(fbody)

            file_chunks = []
            for f in (files or [])[:15]:
                patch = f.get("patch", "") or ""
                if len(patch) > 1200:
                    patch = patch[:1200] + "\n...[truncated]"
                file_chunks.append(
                    f"FILE: {f.get('filename')} (+{f.get('additions', 0)}/-{f.get('deletions', 0)})\n{patch}"
                )
            diff_text = "\n\n".join(file_chunks)

            prompt = f"""You are a security reviewer triaging a bug-fix pull request.
Determine the severity of the bug being fixed based on the PR content.

PR title: {pr.get('title', '')}
PR body: {pr.get('body', '')}
Changed files summary:
{diff_text}

Severity tiers:
- critical: security vulnerability, data loss, auth bypass, production outage
- high: major functional bug, significant regression, crash
- medium: moderate bug affecting some users/workflows
- low: minor bug, cosmetic, docs, small improvement

Return JSON only:
{{"severity": "critical|high|medium|low", "confidence": 0-100, "reasoning": "concise explanation"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(raw, str):
                raw = json.loads(raw)
            if not isinstance(raw, dict):
                raise gl.vm.UserError(f"{ERROR_LLM} non-dict LLM response")
            severity = str(raw.get("severity", "")).strip().lower()
            if severity not in ("critical", "high", "medium", "low"):
                raise gl.vm.UserError(f"{ERROR_LLM} invalid severity: {severity}")
            # parse confidence defensively
            try:
                confidence = int(round(float(str(raw.get("confidence", 0)).strip())))
            except (ValueError, TypeError):
                confidence = 0
            if confidence < 0 or confidence > 100:
                confidence = max(0, min(100, confidence))
            # gate: critical claims require high confidence
            if severity == "critical" and confidence < 70:
                raise gl.vm.UserError(f"{ERROR_LLM} critical requires confidence>=70, got {confidence}")
            reasoning = str(raw.get("reasoning", ""))
            return {"severity": severity, "confidence": confidence, "reasoning": reasoning}

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)
            validator_result = leader_fn()
            if leaders_res.calldata["severity"] != validator_result["severity"]:
                return False
            # confidence within tolerance
            lc = int(leaders_res.calldata.get("confidence", 0))
            vc = int(validator_result.get("confidence", 0))
            return abs(lc - vc) <= 15

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        submission.severity = result["severity"]
        submission.reasoning = result["reasoning"]
        submission.confidence = u256(result.get("confidence", 0))
        submission.payout = self._reward_for(bounty, result["severity"])
        submission.status = "evaluated"
        submission.evaluated = True
        self.submissions[bounty_id][submission_id] = submission

    # ---------- release on merge ----------

    @gl.public.write
    def release_bounty(self, bounty_id: str, submission_id: str, current_date: str = "") -> None:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown bounty")
        if bounty_id not in self.submissions or submission_id not in self.submissions[bounty_id]:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} unknown submission")
        bounty = self.bounties[bounty_id]
        submission = self.submissions[bounty_id][submission_id]
        if not submission.evaluated:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} not evaluated yet")
        if submission.paid:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} already paid")
        if bounty.status != "open":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} bounty closed")

        owner, repo, number = self._parse_pr(submission.pr_url)
        api_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}"

        def leader_fn():
            res = gl.nondet.web.get(api_url)
            if res.status >= 500:
                raise gl.vm.UserError(f"{ERROR_TRANSIENT} GitHub API unavailable: {res.status}")
            if res.status >= 400:
                raise gl.vm.UserError(f"{ERROR_EXTERNAL} GitHub API error: {res.status}")
            body = res.body
            if isinstance(body, (bytes, bytearray)):
                body = body.decode("utf-8")
            pr = json.loads(body)
            return {"merged": bool(pr.get("merged", False))}

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)
            validator_result = leader_fn()
            return leaders_res.calldata["merged"] == validator_result["merged"]

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        if not result["merged"]:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} PR not merged yet")

        amount = submission.payout
        if amount > bounty.pool:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} insufficient bounty pool")
        researcher = submission.researcher
        addr = Address(researcher)
        # send value to researcher (EOA)
        _Recipient(Address(researcher)).emit_transfer(value=amount)

        # update reputation (weighted) + merge count + total earned
        if addr not in self.reputation:
            self.reputation[addr] = u256(0)
        if addr not in self.merge_count:
            self.merge_count[addr] = u256(0)
        if addr not in self.total_earned:
            self.total_earned[addr] = u256(0)
        points = SEVERITY_POINTS.get(submission.severity, 1)
        self.reputation[addr] = self.reputation[addr] + u256(points)
        self.merge_count[addr] = self.merge_count[addr] + u256(1)
        self.total_earned[addr] = self.total_earned[addr] + amount

        # deduct pool
        bounty.pool = bounty.pool - amount
        self.bounties[bounty_id] = bounty

        submission.status = "paid"
        submission.paid = True
        self.submissions[bounty_id][submission_id] = submission

    # ---------- views ----------

    @gl.public.view
    def get_bounty(self, bounty_id: str) -> dict:
        if bounty_id not in self.bounties:
            return {}
        b = self.bounties[bounty_id]
        return {
            "id": b.id,
            "creator": b.creator,
            "title": b.title,
            "description": b.description,
            "repo": b.repo,
            "reward_critical": int(b.reward_critical),
            "reward_high": int(b.reward_high),
            "reward_medium": int(b.reward_medium),
            "reward_low": int(b.reward_low),
            "status": b.status,
            "total_funded": int(b.total_funded),
            "deadline": b.deadline,
            "pool": int(b.pool),
        }

    @gl.public.view
    def get_submissions(self, bounty_id: str) -> dict:
        if bounty_id not in self.submissions:
            return {}
        out = {}
        for sid, sub in self.submissions[bounty_id].items():
            out[sid] = {
                "id": sub.id,
                "bounty_id": sub.bounty_id,
                "researcher": sub.researcher,
                "pr_url": sub.pr_url,
                "severity": sub.severity,
                "reasoning": sub.reasoning,
                "confidence": int(sub.confidence),
                "payout": int(sub.payout),
                "status": sub.status,
                "evaluated": sub.evaluated,
                "paid": sub.paid,
            }
        return out

    @gl.public.view
    def get_reputation(self, researcher: str) -> int:
        addr = Address(researcher)
        if addr not in self.reputation:
            return 0
        return int(self.reputation[addr])

    @gl.public.view
    def get_contributor_stats(self, researcher: str) -> dict:
        addr = Address(researcher)
        rep = int(self.reputation[addr]) if addr in self.reputation else 0
        merges = int(self.merge_count[addr]) if addr in self.merge_count else 0
        earned = int(self.total_earned[addr]) if addr in self.total_earned else 0
        return {"reputation": rep, "merges": merges, "total_earned": earned}
