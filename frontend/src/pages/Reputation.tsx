import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readContract, getAddress } from "@/services/genlayer";
import { Award, Search } from "lucide-react";

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
function toPlain(value: any): any {
  if (value instanceof Map) {
    const obj: any = {};
    for (const [k, v] of value.entries()) obj[String(k)] = toPlain(v);
    return obj;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const obj: any = {};
    for (const [k, v] of Object.entries(value)) obj[k] = toPlain(v);
    return obj;
  }
  return value;
}

export default function Reputation({ connected }: { connected: boolean }) {
  const [addr, setAddr] = useState(getAddress() || "");
  const [rep, setRep] = useState<number|null>(null);
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!connected) { setErr("Connect wallet first."); return; }
    if (!addr) { setErr("Enter an address."); return; }
    setErr(""); setLoading(true);
    try {
      const r = await readContract("get_reputation", [addr]);
      const s = toPlain(await readContract("get_contributor_stats", [addr]));
      setRep(Number(r)); setStats(s);
    } catch(e:any) { setErr(e?.message || String(e)); }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10 py-14">
      <div className="text-center mb-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3"><Award className="h-6 w-6"/></div>
        <h1 className="text-3xl font-bold">Portable Reputation</h1>
        <p className="text-muted-foreground mt-2">Query on-chain reputation, merge counts, and total earned for any researcher address.</p>
      </div>
      <Card className="glass">
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-primary"/>Lookup Researcher</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="0x..." value={addr} onChange={e=>setAddr(e.target.value)} />
            <Button onClick={load} disabled={loading}>{loading?"Loading...":"Lookup"}</Button>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          {rep !== null && (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center"><div className="text-3xl font-bold text-primary">{rep}</div><div className="text-sm text-muted-foreground mt-1">Reputation Points</div></div>
              <div className="rounded-lg border p-4 text-center"><div className="text-3xl font-bold">{stats ? String(stats.merges) : "-"}</div><div className="text-sm text-muted-foreground mt-1">Merges</div></div>
              <div className="rounded-lg border p-4 text-center"><div className="text-2xl font-bold">{stats ? fmtGen(stats.total_earned) : "-"}</div><div className="text-sm text-muted-foreground mt-1">Total Earned</div></div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Reputation is weighted by severity (Critical 10, High 5, Medium 3, Low 1) and updated on successful bounty release.</p>
        </CardContent>
      </Card>
    </div>
  );
}
