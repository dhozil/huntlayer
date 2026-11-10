import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectWithPrivateKey, connectRandom } from "@/services/genlayer";
import { X, KeyRound, Wallet } from "lucide-react";

export function ConnectModal({ open, onClose, onConnected }: { open:boolean; onClose:()=>void; onConnected:(addr:string)=>void }) {
  const [pk, setPk] = useState("");
  const [err, setErr] = useState("");
  if (!open) return null;
  const doPk = () => {
    try { setErr(""); const addr = connectWithPrivateKey(pk.trim()); onConnected(addr); onClose(); }
    catch(e:any){ setErr(e.message || "Invalid key"); }
  };
  const doRandom = () => {
    try { setErr(""); const addr = connectRandom(); onConnected(addr); onClose(); }
    catch(e:any){ setErr(e.message || "Failed"); }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/>Connect Wallet</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Use a Studionet account. For demo you can paste a private key (stored in session only) or generate an ephemeral account.</p>
        <label className="text-sm font-medium">Private Key (hex)</label>
        <Input type="password" placeholder="0x..." value={pk} onChange={e=>setPk(e.target.value)} className="mt-1 mb-3" />
        {err && <p className="text-sm text-red-400 mb-2">{err}</p>}
        <div className="flex gap-2">
          <Button onClick={doPk} className="flex-1" disabled={!pk.trim()}><KeyRound className="h-4 w-4"/>Connect</Button>
          <Button variant="secondary" onClick={doRandom} className="flex-1">Generate Demo</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Never use mainnet keys. Ephemeral/demo accounts may need Studionet faucet funding for fees.</p>
      </div>
    </div>
  );
}
