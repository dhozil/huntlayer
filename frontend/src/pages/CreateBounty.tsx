import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TxStatus, TxState } from "@/components/TxStatus";
import { readContract, writeContract, waitForTx, isTxSuccessful } from "@/services/genlayer";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { PlusCircle, Coins, Lock, RefreshCw, Search, Settings } from "lucide-react";

const idle: TxState = { status: "idle" };

function parseGenToWei(v: string): bigint {
  const s = (v || "0").trim();
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".") return 0n;
  const [i, f = ""] = s.split(".");
  const frac = (f + "0".repeat(18)).slice(0, 18);
  return BigInt(i || "0") * 10n ** 18n + BigInt(frac);
}
function fmtGen(v: any): string {
  try {
    const n = BigInt(v ?? 0);
    const neg = n < 0n;
    const x = neg ? -n : n;
    const i = x / 10n ** 18n;
    const f = (x % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
    return `${neg ? "-" : ""}${i.toString()}${f ? "." + f : ""} GEN`;
  } catch { return String(v); }
}

export default function CreateBounty({ connected }: { connected: boolean }) {
  const [tx, setTx] = useState<TxState>(idle);
  const [c, setC] = useState({ title:"", desc:"", repo:"", rc:"10", rh:"5", rm:"2", rl:"1", deadline:"2099-12-31", fund:"1" });
  const [manageId, setManageId] = useState("bounty_0");
  const [bounty, setBounty] = useState<any>(null);
  const [subs, setSubs] = useState<any>(null);
  const [fundAmt, setFundAmt] = useState("0.5");
  const [subId, setSubId] = useState("sub_0");
  const [loading, setLoading] = useState(false);

  async function run(label: string, fn: () => Promise<string>, after?: () => Promise<void>) {
    if (!connected) { setTx({ status:"error", message:"Connect wallet first." }); return; }
    try {
      setTx({ status:"pending", message: label + " — submitting..." });
      const hash = await fn();
      setTx({ status:"pending", hash, message: `${label} — submitted, waiting for finalization...` });
      const receipt = await waitForTx(hash);
      const ok = isTxSuccessful(receipt);
      if (ok === false) {
        const reason = (receipt as any)?.message || (receipt as any)?.error || (receipt as any)?.txExecutionResultName || "execution failed";
        throw new Error(`${label} failed: ${String(reason)}`);
      }
      setTx({ status:"success", hash, message: label + (ok ? " finalized successfully." : " submitted (final status not confirmed by client).") });
      if (after) await after();
    } catch(e:any) {
      const msg = e?.shortMessage || e?.message || String(e);
      const m = msg.match(/0x[a-fA-F0-9]{64}/);
      setTx({ status:"error", hash: m?.[0], message: msg });
    }
  }

  async function loadManage(id = manageId) {
    if (!connected) { setTx({ status:"error", message:"Connect wallet first to read." }); return; }
    setLoading(true);
    try {
      const b = await readContract("get_bounty", [id]);
      const s = await readContract("get_submissions", [id]);
      setBounty(b); setSubs(s);
      setTx({ status:"success", message:`Loaded ${id}.` });
    } catch(e:any) { setTx({ status:"error", message: e?.message || String(e) }); }
    setLoading(false);
  }

  const sev = (sub:any) => {
    const m:Record<string,"danger"|"warning"|"default"|"secondary"> = {critical:"danger", high:"warning", medium:"default", low:"secondary"};
    return <Badge variant={m[sub.severity]||"outline"}>{sub.severity || "unassigned"}</Badge>;
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Create & Manage Bounties</h1>
          <p className="text-muted-foreground mt-1">Creators can publish funded bounties here. Researchers browse and submit from the <b>Explore</b> page. Contract: <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{CONTRACT_ADDRESS}</code></p>
        </div>
        {!connected && <Badge variant="warning">Wallet not connected — connect to create/manage</Badge>}
      </div>

      <TxStatus state={tx} onReset={()=>setTx(idle)} />

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="glass">
          <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-primary"/>Create New Bounty (Creator)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title (e.g. Fix auth bypass in login)" value={c.title} onChange={e=>setC({...c,title:e.target.value})} />
            <Input placeholder="Description / scope" value={c.desc} onChange={e=>setC({...c,desc:e.target.value})} />
            <Input placeholder="Target repo (owner/name)" value={c.repo} onChange={e=>setC({...c,repo:e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Critical reward (GEN)</label><Input value={c.rc} onChange={e=>setC({...c,rc:e.target.value})}/></div>
              <div><label className="text-xs text-muted-foreground">High reward (GEN)</label><Input value={c.rh} onChange={e=>setC({...c,rh:e.target.value})}/></div>
              <div><label className="text-xs text-muted-foreground">Medium reward (GEN)</label><Input value={c.rm} onChange={e=>setC({...c,rm:e.target.value})}/></div>
              <div><label className="text-xs text-muted-foreground">Low reward (GEN)</label><Input value={c.rl} onChange={e=>setC({...c,rl:e.target.value})}/></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Deadline (YYYY-MM-DD, metadata)</label><Input value={c.deadline} onChange={e=>setC({...c,deadline:e.target.value})}/></div>
              <div><label className="text-xs text-muted-foreground">Initial fund (GEN)</label><Input value={c.fund} onChange={e=>setC({...c,fund:e.target.value})}/></div>
            </div>
            <Button className="w-full" disabled={tx.status==="pending"} onClick={()=>run("Create bounty", ()=>writeContract("create_bounty",[c.title,c.desc,c.repo,parseGenToWei(c.rc),parseGenToWei(c.rh),parseGenToWei(c.rm),parseGenToWei(c.rl),c.deadline], parseGenToWei(c.fund)))}>Create & Fund (publish publicly)</Button>
            <p className="text-xs text-muted-foreground">Once created, your bounty appears on the public Explore page for researchers to submit PRs.</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary"/>Manage Your Bounty (Creator actions)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="bounty_id (e.g. bounty_0)" value={manageId} onChange={e=>setManageId(e.target.value)} />
              <Button variant="secondary" onClick={()=>loadManage()} disabled={loading || tx.status==="pending"}><Search className="h-4 w-4"/>Load</Button>
            </div>
            {bounty && (bounty.id || bounty.title) ? (
              <div className="rounded-lg border p-4 space-y-1 text-sm">
                <div className="flex items-center justify-between"><span className="font-semibold">{bounty.title || bounty.id}</span><Badge variant={bounty.status==="open"?"success":"secondary"}>{bounty.status}</Badge></div>
                <div className="text-muted-foreground">{bounty.description}</div>
                <div>Repo: <b>{bounty.repo}</b> · Deadline: <b>{bounty.deadline || "—"}</b></div>
                <div>Pool: <b className="text-primary">{fmtGen(bounty.pool)}</b> · Funded: {fmtGen(bounty.total_funded)}</div>
                <div className="text-xs">Rewards: C {fmtGen(bounty.reward_critical)} · H {fmtGen(bounty.reward_high)} · M {fmtGen(bounty.reward_medium)} · L {fmtGen(bounty.reward_low)}</div>
                <div className="text-xs text-muted-foreground break-all">Creator: {bounty.creator}</div>
              </div>
            ) : bounty && <p className="text-sm text-muted-foreground">No bounty found.</p>}

            <div className="rounded-lg border p-3 space-y-2">
              <div className="text-sm font-medium flex items-center gap-2"><Coins className="h-4 w-4"/>Top up pool</div>
              <div className="flex gap-2">
                <Input placeholder="Amount (GEN)" value={fundAmt} onChange={e=>setFundAmt(e.target.value)} />
                <Button disabled={tx.status==="pending"} onClick={()=>run("Fund bounty", ()=>writeContract("fund_bounty",[manageId], parseGenToWei(fundAmt)), ()=>loadManage())}>Fund</Button>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="text-sm font-medium flex items-center gap-2"><Lock className="h-4 w-4"/>Close & Withdraw (creator only)</div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="secondary" disabled={tx.status==="pending"} onClick={()=>run("Close bounty", ()=>writeContract("close_bounty",[manageId]), ()=>loadManage())}>Close</Button>
                <Button className="flex-1" variant="outline" disabled={tx.status==="pending"} onClick={()=>run("Withdraw pool", ()=>writeContract("withdraw_pool",[manageId]), ()=>loadManage())}>Withdraw remaining</Button>
              </div>
              <p className="text-xs text-muted-foreground">Close to stop new submissions, then withdraw any remaining pool.</p>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <div className="text-sm font-medium flex items-center gap-2"><RefreshCw className="h-4 w-4"/>Reopen evaluation (creator only)</div>
              <div className="flex gap-2">
                <Input placeholder="submission_id (e.g. sub_0)" value={subId} onChange={e=>setSubId(e.target.value)} />
                <Button variant="secondary" disabled={tx.status==="pending"} onClick={()=>run("Reopen evaluation", ()=>writeContract("reopen_evaluation",[manageId, subId]), ()=>loadManage())}>Reopen</Button>
              </div>
            </div>

            {subs && Object.keys(subs).length>0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Submissions</div>
                {Object.entries(subs).map(([id, s]:any)=>(
                  <div key={id} className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between"><span className="font-mono text-xs">{id}</span><div className="flex gap-1">{sev(s)}{s.paid && <Badge variant="success">paid</Badge>}</div></div>
                    <div className="break-all text-xs text-muted-foreground">{s.pr_url}</div>
                    <div className="text-xs">Evaluated: {String(s.evaluated)} · Status: {s.status} · Payout: {fmtGen(s.payout)} · Confidence: {String(s.confidence ?? 0)}%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground mt-6">Amounts in GEN. Only the bounty creator can close, withdraw, or reopen evaluation on-chain. Public submissions and evaluation happen from the Explore page.</p>
    </div>
  );
}
