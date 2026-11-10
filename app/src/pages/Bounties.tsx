import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TxStatus, TxState } from "@/components/TxStatus";
import { readContract, writeContract, waitForTx, getAddress } from "@/services/genlayer";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { Search, PlusCircle, Coins, Send, CheckCircle, GitMerge, Lock, RefreshCw, Info } from "lucide-react";

const idle: TxState = { status: "idle" };

function wei(v: string) { try { return BigInt(v || "0"); } catch { return 0n; } }
function fmtWei(v: any) { try { const n = BigInt(v); return (Number(n)/1e18).toFixed(4)+" GEN"; } catch { return String(v); } }

export default function Bounties({ connected }: { connected: boolean }) {
  const [tx, setTx] = useState<TxState>(idle);
  const [bountyId, setBountyId] = useState("bounty_0");
  const [bounty, setBounty] = useState<any>(null);
  const [subs, setSubs] = useState<any>(null);
  const [loadingRead, setLoadingRead] = useState(false);

  // create form
  const [c, setC] = useState({ title:"", desc:"", repo:"", rc:"10000000000000000000", rh:"5000000000000000000", rm:"2000000000000000000", rl:"1000000000000000000", deadline:"2099-12-31", fund:"1000000000000000000" });
  // action inputs
  const [fundAmt, setFundAmt] = useState("500000000000000000");
  const [prUrl, setPrUrl] = useState("https://github.com/owner/repo/pull/1");
  const [curDate, setCurDate] = useState("2026-01-01");
  const [subId, setSubId] = useState("sub_0");

  async function run(label: string, fn: () => Promise<string>) {
    if (!connected) { setTx({ status:"error", message:"Connect wallet first." }); return; }
    try {
      setTx({ status:"pending", message: label });
      const hash = await fn();
      setTx({ status:"pending", hash, message: `${label} — waiting for receipt...` });
      try { await waitForTx(hash); } catch { /* some clients auto-wait */ }
      setTx({ status:"success", hash, message: label + " completed." });
    } catch(e:any) {
      const msg = e?.shortMessage || e?.message || String(e);
      // try to extract tx hash if present
      const m = msg.match(/0x[a-fA-F0-9]{64}/);
      setTx({ status:"error", hash: m?.[0], message: msg });
    }
  }

  async function loadBounty() {
    if (!connected) { setTx({ status:"error", message:"Connect wallet first to read." }); return; }
    setLoadingRead(true);
    try {
      const b = await readContract("get_bounty", [bountyId]);
      const s = await readContract("get_submissions", [bountyId]);
      setBounty(b); setSubs(s);
      setTx({ status:"success", message:`Loaded ${bountyId}.` });
    } catch(e:any) { setTx({ status:"error", message: e?.message || String(e) }); }
    setLoadingRead(false);
  }

  const sev = (sub:any) => {
    const m:Record<string,"danger"|"warning"|"default"|"secondary"> = {critical:"danger", high:"warning", medium:"default", low:"secondary"};
    return <Badge variant={m[sub.severity]||"outline"}>{sub.severity || "unassigned"}</Badge>;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bounties Dashboard</h1>
          <p className="text-muted-foreground mt-1">Interact with HuntLayer on Studionet. Contract: <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{CONTRACT_ADDRESS}</code></p>
        </div>
        {!connected && <Badge variant="warning">Wallet not connected — connect to read/write</Badge>}
      </div>

      <TxStatus state={tx} onReset={()=>setTx(idle)} />

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="glass">
          <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-primary"/>Create Bounty</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={c.title} onChange={e=>setC({...c,title:e.target.value})} />
            <Input placeholder="Description" value={c.desc} onChange={e=>setC({...c,desc:e.target.value})} />
            <Input placeholder="Repo (owner/name)" value={c.repo} onChange={e=>setC({...c,repo:e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Critical (wei)</label><Input value={c.rc} onChange={e=>setC({...c,rc:e.target.value})}/></div>
              <div><label className="text-xs text-muted-foreground">High (wei)</label><Input value={c.rh} onChange={e=>setC({...c,rh:e.target.value})}/></div>
              <div><label className="text-xs text-muted-foreground">Medium (wei)</label><Input value={c.rm} onChange={e=>setC({...c,rm:e.target.value})}/></div>
              <div><label className="text-xs text-muted-foreground">Low (wei)</label><Input value={c.rl} onChange={e=>setC({...c,rl:e.target.value})}/></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Deadline (YYYY-MM-DD)</label><Input value={c.deadline} onChange={e=>setC({...c,deadline:e.target.value})}/></div>
              <div><label className="text-xs text-muted-foreground">Initial fund (wei)</label><Input value={c.fund} onChange={e=>setC({...c,fund:e.target.value})}/></div>
            </div>
            <Button className="w-full" disabled={tx.status==="pending"} onClick={()=>run("Create bounty", ()=>writeContract("create_bounty",[c.title,c.desc,c.repo,Number(c.rc),Number(c.rh),Number(c.rm),Number(c.rl),c.deadline], wei(c.fund)))}>Create & Fund</Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary"/>Load Bounty & Submissions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="bounty_0" value={bountyId} onChange={e=>setBountyId(e.target.value)} />
              <Button variant="secondary" onClick={loadBounty} disabled={loadingRead || tx.status==="pending"}><Search className="h-4 w-4"/>Load</Button>
            </div>
            {bounty && Object.keys(bounty).length>0 ? (
              <div className="rounded-lg border p-4 space-y-1 text-sm">
                <div className="flex items-center justify-between"><span className="font-semibold">{bounty.title || bounty.id}</span><Badge variant={bounty.status==="open"?"success":"secondary"}>{bounty.status}</Badge></div>
                <div className="text-muted-foreground">{bounty.description}</div>
                <div>Repo: <b>{bounty.repo}</b> · Deadline: <b>{bounty.deadline || "—"}</b></div>
                <div>Pool: <b className="text-primary">{fmtWei(bounty.pool)}</b> · Funded: {fmtWei(bounty.total_funded)}</div>
                <div className="text-xs">Rewards (wei): C {String(bounty.reward_critical)} / H {String(bounty.reward_high)} / M {String(bounty.reward_medium)} / L {String(bounty.reward_low)}</div>
                <div className="text-xs text-muted-foreground">Creator: {bounty.creator}</div>
              </div>
            ) : bounty && <p className="text-sm text-muted-foreground">No bounty found.</p>}
            {subs && Object.keys(subs).length>0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Submissions</div>
                {Object.entries(subs).map(([id, s]:any)=>(
                  <div key={id} className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between"><span className="font-mono text-xs">{id}</span><div className="flex gap-1">{sev(s)}{s.paid && <Badge variant="success">paid</Badge>}</div></div>
                    <div className="break-all text-xs text-muted-foreground">{s.pr_url}</div>
                    <div className="text-xs">Evaluated: {String(s.evaluated)} · Status: {s.status} · Payout: {String(s.payout)} · Confidence: {String(s.confidence ?? 0)}</div>
                    {s.reasoning && <div className="text-xs text-muted-foreground">Reason: {s.reasoning}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ActionBox title="Fund Bounty" icon={<Coins className="h-4 w-4"/>}>
                <Input placeholder="bounty_id" value={bountyId} onChange={e=>setBountyId(e.target.value)} />
                <Input placeholder="amount wei" value={fundAmt} onChange={e=>setFundAmt(e.target.value)} />
                <Button disabled={tx.status==="pending"} onClick={()=>run("Fund bounty", ()=>writeContract("fund_bounty",[bountyId], wei(fundAmt)))}>Fund</Button>
              </ActionBox>
              <ActionBox title="Submit PR" icon={<Send className="h-4 w-4"/>}>
                <Input placeholder="bounty_id" value={bountyId} onChange={e=>setBountyId(e.target.value)} />
                <Input placeholder="PR URL" value={prUrl} onChange={e=>setPrUrl(e.target.value)} />
                <Input placeholder="current date YYYY-MM-DD" value={curDate} onChange={e=>setCurDate(e.target.value)} />
                <Button disabled={tx.status==="pending"} onClick={()=>run("Submit PR", ()=>writeContract("submit_pr",[bountyId, prUrl, curDate]))}>Submit</Button>
              </ActionBox>
              <ActionBox title="Evaluate Severity" icon={<CheckCircle className="h-4 w-4"/>}>
                <Input placeholder="bounty_id" value={bountyId} onChange={e=>setBountyId(e.target.value)} />
                <Input placeholder="submission_id" value={subId} onChange={e=>setSubId(e.target.value)} />
                <Input placeholder="current date" value={curDate} onChange={e=>setCurDate(e.target.value)} />
                <Button disabled={tx.status==="pending"} onClick={()=>run("Evaluate severity", ()=>writeContract("evaluate_severity",[bountyId, subId, curDate]))}>Evaluate (AI Consensus)</Button>
              </ActionBox>
              <ActionBox title="Release Bounty" icon={<GitMerge className="h-4 w-4"/>}>
                <Input placeholder="bounty_id" value={bountyId} onChange={e=>setBountyId(e.target.value)} />
                <Input placeholder="submission_id" value={subId} onChange={e=>setSubId(e.target.value)} />
                <Input placeholder="current date" value={curDate} onChange={e=>setCurDate(e.target.value)} />
                <Button disabled={tx.status==="pending"} onClick={()=>run("Release bounty", ()=>writeContract("release_bounty",[bountyId, subId, curDate]))}>Release on Merge</Button>
              </ActionBox>
              <ActionBox title="Close / Expire" icon={<Lock className="h-4 w-4"/>}>
                <Input placeholder="bounty_id" value={bountyId} onChange={e=>setBountyId(e.target.value)} />
                <Input placeholder="current date (for expire)" value={curDate} onChange={e=>setCurDate(e.target.value)} />
                <div className="flex gap-2"><Button className="flex-1" variant="secondary" disabled={tx.status==="pending"} onClick={()=>run("Close bounty", ()=>writeContract("close_bounty",[bountyId]))}>Close</Button>
                <Button className="flex-1" variant="outline" disabled={tx.status==="pending"} onClick={()=>run("Close if expired", ()=>writeContract("close_if_expired",[bountyId, curDate]))}>Expire</Button></div>
              </ActionBox>
              <ActionBox title="Reopen Evaluation" icon={<RefreshCw className="h-4 w-4"/>}>
                <Input placeholder="bounty_id" value={bountyId} onChange={e=>setBountyId(e.target.value)} />
                <Input placeholder="submission_id" value={subId} onChange={e=>setSubId(e.target.value)} />
                <Button disabled={tx.status==="pending"} onClick={()=>run("Reopen evaluation", ()=>writeContract("reopen_evaluation",[bountyId, subId]))}>Reopen</Button>
              </ActionBox>
            </div>
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground mt-6">Note: amounts are in wei (1 GEN = 10^18 wei). Consensus operations (evaluate/release) may take ~30-90s. Ensure PR URLs are real and accessible; release requires the PR to be merged.</p>
    </div>
  );
}

function ActionBox({ title, icon, children }: { title:string; icon:React.ReactNode; children:React.ReactNode }) {
  return <div className="rounded-lg border p-4 space-y-2"><div className="font-medium flex items-center gap-2 text-sm">{icon}{title}</div>{children}</div>;
}
