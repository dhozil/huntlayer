import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TxStatus, TxState } from "@/components/TxStatus";
import { readContract, writeContract, waitForTx, isTxSuccessful } from "@/services/genlayer";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { Search, Send, CheckCircle, GitMerge, RefreshCw, Globe, List } from "lucide-react";

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

export default function ExploreBounties({ connected }: { connected: boolean }) {
  const [tx, setTx] = useState<TxState>(idle);
  const [list, setList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filter, setFilter] = useState<"all"|"open"|"closed">("open");
  const [selectedId, setSelectedId] = useState<string>("");
  const [bounty, setBounty] = useState<any>(null);
  const [subs, setSubs] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [subId, setSubId] = useState("sub_0");
  const [manualId, setManualId] = useState("");

  async function run(label: string, fn: () => Promise<string>) {
    if (!connected) { setTx({ status:"error", message:"Connect wallet to perform this action." }); return; }
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
      if (selectedId) await loadDetail(selectedId, true);
    } catch(e:any) {
      const msg = e?.shortMessage || e?.message || String(e);
      const m = msg.match(/0x[a-fA-F0-9]{64}/);
      setTx({ status:"error", hash: m?.[0], message: msg });
    }
  }

  async function loadList() {
    if (!connected) { setTx({ status:"error", message:"Connect wallet to load public bounties (on-chain read)." }); return; }
    setLoadingList(true);
    try {
      const rawCount = await readContract("get_bounty_count", []);
      const count = typeof rawCount === "bigint" ? Number(rawCount) : Number(rawCount?.value ?? rawCount);
      const items: any[] = [];
      const errors: string[] = [];
      if (!Number.isFinite(count) || count < 0) {
        throw new Error(`Unexpected bounty count: ${String(rawCount)}`);
      }
      for (let i = count - 1; i >= 0; i--) {
        const id = `bounty_${i}`;
        try {
          const b = await readContract("get_bounty", [id]);
          if (b && (b.id || b.title || b.creator)) items.push({ ...b, id: b.id || id });
        } catch (e:any) {
          errors.push(`${id}: ${e?.shortMessage || e?.message || String(e)}`);
        }
      }
      setList(items);
      if (items.length) {
        setTx({ status:"success", message:`Loaded ${items.length}/${count} bount${count===1?"y":"ies"} from chain.` + (errors.length ? ` (${errors.length} failed to load)` : "") });
      } else if (count === 0) {
        setTx({ status:"success", message:"No bounties found on-chain yet for this contract." });
      } else {
        console.error("Failed to load bounties", errors);
        setTx({ status:"error", message:`Found ${count} bounties on-chain but failed to load details. ${errors[0] || ""}` });
      }
    } catch(e:any) {
      console.error(e);
      setTx({ status:"error", message: e?.shortMessage || e?.message || String(e) });
    }
    setLoadingList(false);
  }

  async function loadDetail(id: string, silent=false) {
    if (!connected) { setTx({ status:"error", message:"Connect wallet to view bounty details." }); return; }
    setLoadingDetail(true);
    try {
      const b = await readContract("get_bounty", [id]);
      const s = await readContract("get_submissions", [id]);
      setBounty(b); setSubs(s); setSelectedId(id);
      if (!silent) setTx({ status:"success", message:`Loaded ${id}.` });
    } catch(e:any) { if (!silent) setTx({ status:"error", message: e?.message || String(e) }); }
    setLoadingDetail(false);
  }

  useEffect(() => { if (connected) { loadList(); } }, [connected]);

  const filtered = list.filter(b => filter === "all" ? true : b.status === filter);
  const sev = (sub:any) => {
    const m:Record<string,"danger"|"warning"|"default"|"secondary"> = {critical:"danger", high:"warning", medium:"default", low:"secondary"};
    return <Badge variant={m[sub.severity]||"outline"}>{sub.severity || "unassigned"}</Badge>;
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Globe className="h-7 w-7 text-primary"/>Explore Public Bounties</h1>
          <p className="text-muted-foreground mt-1">Browse bounties created on-chain and submit your fix PR. Contract: <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{CONTRACT_ADDRESS}</code></p>
        </div>
        <div className="flex gap-2 items-center">
          {!connected && <Badge variant="warning">Connect wallet to browse</Badge>}
          <Button variant="secondary" onClick={loadList} disabled={loadingList || !connected}><RefreshCw className={`h-4 w-4 ${loadingList?"animate-spin":""}`}/>Refresh</Button>
        </div>
      </div>

      <TxStatus state={tx} onReset={()=>setTx(idle)} />

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><List className="h-5 w-5 text-primary"/>Public Bounties</span>
              <div className="flex gap-1">
                {(["open","all","closed"] as const).map(f => (
                  <Button key={f} size="sm" variant={filter===f?"default":"outline"} onClick={()=>setFilter(f)} className="capitalize">{f}</Button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Load by id (e.g. bounty_0)" value={manualId} onChange={e=>setManualId(e.target.value)} />
              <Button variant="secondary" onClick={()=>manualId && loadDetail(manualId)} disabled={!manualId || !connected}><Search className="h-4 w-4"/>Load</Button>
            </div>
            <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
              {filtered.map((b:any) => (
                <button key={b.id} onClick={()=>loadDetail(b.id)} className={`w-full text-left rounded-lg border p-4 space-y-1 text-sm transition ${selectedId===b.id?"border-primary/60 bg-primary/5":"hover:border-primary/30"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{b.title || b.id}</span>
                    <Badge variant={b.status==="open"?"success":"secondary"}>{b.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{b.description || "No description"}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Repo: <b className="text-foreground">{b.repo}</b></span>
                    <span>Pool: <b className="text-primary">{fmtGen(b.pool)}</b></span>
                    <span>Deadline: {b.deadline || "—"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">{b.id}</div>
                </button>
              ))}
              {!filtered.length && <p className="text-sm text-muted-foreground">{connected ? "No bounties to show. Try Refresh or create one." : "Connect your wallet to load public bounties from chain."}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass">
            <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary"/>Bounty Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {bounty && (bounty.id || bounty.title) ? (
                <div className="rounded-lg border p-4 space-y-1 text-sm">
                  <div className="flex items-center justify-between"><span className="font-semibold">{bounty.title || bounty.id}</span><Badge variant={bounty.status==="open"?"success":"secondary"}>{bounty.status}</Badge></div>
                  <div className="text-muted-foreground">{bounty.description}</div>
                  <div>Repo: <b>{bounty.repo}</b> · Deadline: <b>{bounty.deadline || "—"}</b></div>
                  <div>Pool: <b className="text-primary">{fmtGen(bounty.pool)}</b> · Funded: {fmtGen(bounty.total_funded)}</div>
                  <div className="text-xs">Rewards: Critical {fmtGen(bounty.reward_critical)} · High {fmtGen(bounty.reward_high)} · Medium {fmtGen(bounty.reward_medium)} · Low {fmtGen(bounty.reward_low)}</div>
                  <div className="text-xs text-muted-foreground break-all">Creator: {bounty.creator}</div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Select a bounty from the list to view details and submit a PR.</p>}
              {subs && Object.keys(subs).length>0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Submissions</div>
                  {Object.entries(subs).map(([id, s]:any)=>(
                    <div key={id} className="rounded-lg border p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between"><span className="font-mono text-xs">{id}</span><div className="flex gap-1">{sev(s)}{s.paid && <Badge variant="success">paid</Badge>}</div></div>
                      <div className="break-all text-xs text-muted-foreground">{s.pr_url}</div>
                      <div className="text-xs">Evaluated: {String(s.evaluated)} · Status: {s.status} · Payout: {fmtGen(s.payout)} · Confidence: {String(s.confidence ?? 0)}%</div>
                      {s.reasoning && <div className="text-xs text-muted-foreground">AI explanation (non-consensus): {s.reasoning}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary"/>Submit Fix PR (Researcher)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Found/fixed a bug for this bounty? Submit your merged or open PR URL (must belong to the bounty repo).</p>
              <Input placeholder="bounty_id" value={selectedId} onChange={e=>setSelectedId(e.target.value)} />
              <Input placeholder="https://github.com/owner/repo/pull/123" value={prUrl} onChange={e=>setPrUrl(e.target.value)} />
              <Button className="w-full" disabled={tx.status==="pending" || !selectedId} onClick={()=>run("Submit PR", ()=>writeContract("submit_pr",[selectedId, prUrl]))}>Submit PR</Button>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle className="text-sm">Evaluate / Release (when applicable)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="bounty_id" value={selectedId} onChange={e=>setSelectedId(e.target.value)} />
              <Input placeholder="submission_id (e.g. sub_0)" value={subId} onChange={e=>setSubId(e.target.value)} />
              <div className="flex gap-2">
                <Button className="flex-1" variant="secondary" disabled={tx.status==="pending" || !selectedId} onClick={()=>run("Evaluate severity", ()=>writeContract("evaluate_severity",[selectedId, subId]))}><CheckCircle className="h-4 w-4"/>Evaluate</Button>
                <Button className="flex-1" disabled={tx.status==="pending" || !selectedId} onClick={()=>run("Release bounty", ()=>writeContract("release_bounty",[selectedId, subId]))}><GitMerge className="h-4 w-4"/>Release</Button>
              </div>
              <p className="text-xs text-muted-foreground">Evaluation uses AI consensus on PR evidence; release pays out only when the PR is verified merged and funds are sufficient.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6">Amounts shown in GEN. Public bounty data is read on-chain from <code className="bg-muted/50 px-1 rounded">{CONTRACT_ADDRESS}</code> (wallet connection required). Creators can create/manage bounties from the <b>Create Bounty</b> page.</p>
    </div>
  );
}
