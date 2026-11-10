import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MagnifiedBento from "@/components/ui/magnified-bento";
import { ShieldCheck, GitMerge, Scale, Award, ArrowRight, Bot, Coins } from "lucide-react";

export default function Landing() {
  const features = [
    { icon: Bot, title: "AI Severity Triage", desc: "GenLayer validators independently analyze PRs and reach consensus on severity tiers (Critical/High/Medium/Low)." },
    { icon: GitMerge, title: "Paid on Merge", desc: "Bounties release automatically when the fix PR is verified as merged on GitHub via on-chain web consensus." },
    { icon: Scale, title: "Trustless Adjudication", desc: "No single oracle. Leader/validator consensus with appeals and re-evaluation protects against manipulation." },
    { icon: Coins, title: "Funded Pools & Safety", desc: "Payable pools, top-ups, deadline controls, and pool sufficiency checks prevent double-spend." },
    { icon: Award, title: "Portable Reputation", desc: "Earn weighted reputation, merge counts, and total earned — portable proof of security contributions." },
    { icon: ShieldCheck, title: "Anti-Fraud Guards", desc: "Duplicate PR prevention, creator-only actions, and merge-before-release enforcement." },
  ];
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-10 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary mb-4">Built on GenLayer Intelligent Contracts</div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Hunt bugs. Prove fixes. <span className="gradient-text">Get paid on merge.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              HuntLayer is an automated bug bounty protocol: severity tiers assigned from PR evidence by AI consensus, payouts released on verified merge, and reputation that travels with you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/bounties"><Button size="lg">Launch App <ArrowRight className="h-4 w-4"/></Button></Link>
              <Link to="/how-it-works"><Button size="lg" variant="outline">How it Works</Button></Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md text-sm">
              <div><div className="text-2xl font-semibold text-foreground">4</div><div className="text-muted-foreground">Severity tiers</div></div>
              <div><div className="text-2xl font-semibold text-foreground">On-chain</div><div className="text-muted-foreground">Consensus verdict</div></div>
              <div><div className="text-2xl font-semibold text-foreground">Auto</div><div className="text-muted-foreground">Payout on merge</div></div>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <MagnifiedBento />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center">Why HuntLayer</h2>
        <p className="text-muted-foreground text-center mt-2 max-w-2xl mx-auto">A full lifecycle for bug bounties: fund, submit, evaluate, verify merge, and settle — with portable reputation.</p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <Card key={f.title} className="glass">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4"><f.icon className="h-5 w-5"/></div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-emerald-500/5 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold">Ready to hunt or fund bounties?</h2>
            <p className="text-muted-foreground mt-2">Connect a Studionet wallet and interact with the live HuntLayer contract.</p>
          </div>
          <Link to="/bounties"><Button size="lg">Open Bounties Dashboard</Button></Link>
        </div>
      </section>
    </div>
  );
}
