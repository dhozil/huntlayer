import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, KeyRound, Wallet, PlugZap } from "lucide-react";
import { discoverProviders, getProviders, connectEvmProvider, EIP6963ProviderDetail } from "@/services/evmWallet";
import { connectWithPrivateKey, connectWithEvmProvider } from "@/services/genlayer";
import { shortAddr } from "@/lib/utils";

export function ConnectModal({ open, onClose, onConnected }: { open:boolean; onClose:()=>void; onConnected:(addr:string)=>void }) {
  const [pk, setPk] = useState("");
  const [err, setErr] = useState("");
  const [evmProviders, setEvmProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [evmAddr, setEvmAddr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const unsub = discoverProviders(() => setEvmProviders(getProviders()));
    setEvmProviders(getProviders());
    return () => { unsub(); };
  }, [open]);

  if (!open) return null;

  const doKey = () => {
    try { setErr(""); const r = connectWithPrivateKey(pk.trim()); onConnected(r.address); onClose(); }
    catch(e:any){ setErr(e.message || "Invalid key"); }
  };
  const doEvm = async (p: EIP6963ProviderDetail) => {
    try {
      setErr("");
      const res = await connectEvmProvider(p); // requests only selected provider -> no popup fight
      // Doc-aligned: wire selected EIP-1193 provider into genlayer-js client and connect chain
      const gl = await connectWithEvmProvider(res.address, res.provider);
      setEvmAddr(gl.address);
      onConnected(gl.address);
      onClose();
    } catch(e:any) { setErr(e?.message || "EVM connect failed"); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/>Connect Wallet</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><PlugZap className="h-4 w-4 text-primary"/>EVM Wallets (EIP-6963, no popup conflicts)</h3>
            <p className="text-xs text-muted-foreground mb-2">Detected injected wallets are listed; connecting requests only the selected provider.</p>
            <div className="space-y-2 max-h-40 overflow-auto pr-1">
              {evmProviders.length === 0 && <div className="text-sm text-muted-foreground border rounded-md p-3">No EVM wallet detected. Install MetaMask/Rabby or use key connect below.</div>}
              {evmProviders.map(p => (
                <button key={p.info.uuid} onClick={() => doEvm(p)} className="w-full flex items-center gap-3 border rounded-md p-3 hover:bg-muted/40 text-left">
                  {p.info.icon ? <img src={p.info.icon} alt="" className="h-6 w-6" /> : <div className="h-6 w-6 rounded bg-muted" />}
                  <div><div className="text-sm font-medium">{p.info.name}</div><div className="text-xs text-muted-foreground">{p.info.rdns}</div></div>
                </button>
              ))}
            </div>
            {evmAddr && <p className="text-xs text-zinc-300 mt-2">EVM connected: {shortAddr(evmAddr)}</p>}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary"/>GenLayer Signing Account (Real Wallet Key)</h3>
            <p className="text-xs text-muted-foreground mb-2">Paste your real Studionet wallet private key. Used by genlayer-js to sign read/write transactions on-chain. No demo or generated keys.</p>
            <Input type="password" placeholder="0x... (real wallet private key)" value={pk} onChange={e=>setPk(e.target.value)} className="mb-3" />
            <Button onClick={doKey} className="w-full" disabled={!pk.trim()}>Connect Real Wallet Key</Button>
          </div>

          {err && <p className="text-sm text-red-400">{err}</p>}
          <p className="text-xs text-muted-foreground">Never use mainnet keys on Studionet. Ensure your wallet is funded for required fees.</p>
        </div>
      </div>
    </div>
  );
}
