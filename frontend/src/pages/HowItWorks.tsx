import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, FileCode2, Bot, GitMerge, Award, ShieldAlert } from "lucide-react";

const steps = [
  { icon: Wallet, title: "1. Create & Fund Bounty", desc: "A maintainer creates a bounty with repo scope, deadline, and rewards per severity tier (Critical/High/Medium/Low), funding the on-chain pool. Pools can be topped up anytime." },
  { icon: FileCode2, title: "2. Submit Fix PR", desc: "A researcher submits a GitHub PR URL to the bounty. The contract enforces anti-duplication (same PR cannot be reused) and deadline/status checks." },
  { icon: Bot, title: "3. Consensus Severity Evaluation", desc: "GenLayer validators fetch PR data from GitHub, and AI independently assesses severity and confidence. Validators compare severity and confidence (tolerance) to reach consensus; critical claims require high confidence." },
  { icon: GitMerge, title: "4. Verify Merge & Release", desc: "Once evaluated, anyone can trigger release. Validators verify the PR is merged; if yes and pool is sufficient, payout transfers to the researcher automatically." },
  { icon: Award, title: "5. Portable Reputation", desc: "On successful payout, the researcher earns weighted reputation points, merge count, and total earned — queryable on-chain by address." },
  { icon: ShieldAlert, title: "6. Safety & Appeals", desc: "Creator-only controls (close/reopen), deadline expiry handling, pool sufficiency checks, and GenLayer's native appeal/finality model protect against errors and manipulation." },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-14">
      <div className="text-center mb-12">
        <Badge variant="default" className="mb-3">Protocol Flow</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold">How HuntLayer Works</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Work verified by consensus, paid on outcome, with portable reputation — powered by GenLayer Intelligent Contracts.</p>
      </div>
      <div className="grid gap-5">
        {steps.map(s => (
          <Card key={s.title} className="glass">
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><s.icon className="h-5 w-5"/></div>
              <div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-muted-foreground mt-1">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-12 grid sm:grid-cols-2 gap-5">
        <Card className="glass"><CardContent className="p-6"><h3 className="font-semibold mb-2">Severity & Rewards</h3><ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4"><li><b className="text-foreground">Critical</b>: security/data loss/auth bypass — highest reward, high confidence gate</li><li><b className="text-foreground">High</b>: major functional bug/crash</li><li><b className="text-foreground">Medium</b>: moderate bug affecting workflows</li><li><b className="text-foreground">Low</b>: minor/cosmetic/docs improvements</li></ul></CardContent></Card>
        <Card className="glass"><CardContent className="p-6"><h3 className="font-semibold mb-2">Consensus & Accuracy</h3><ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4"><li>Validators independently fetch PR evidence and re-evaluate.</li><li>Severity must match; confidence compared within tolerance.</li><li>Errors classified (expected/external/transient/LLM) for fair consensus.</li><li>Native appeal/finality provides additional protection.</li></ul></CardContent></Card>
      </div>
    </div>
  );
}
