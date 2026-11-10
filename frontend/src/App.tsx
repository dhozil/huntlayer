import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Landing from "@/pages/Landing";
import HowItWorks from "@/pages/HowItWorks";
import Bounties from "@/pages/Bounties";
import Reputation from "@/pages/Reputation";
import { getAddress, disconnectAll, connectWithEvmProvider } from "@/services/genlayer";
import { discoverProviders, getProviders, connectEvmProvider } from "@/services/evmWallet";

function Footer() {
  return (
    <footer className="border-t border-border/60 mt-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <div>HuntLayer — Automated Bug Bounties on GenLayer Studionet</div>
        <div className="flex gap-4"><a className="hover:text-foreground" href="https://docs.genlayer.com" target="_blank" rel="noreferrer">Docs</a><a className="hover:text-foreground" href="https://studio.genlayer.com" target="_blank" rel="noreferrer">Studio</a></div>
      </div>
    </footer>
  );
}

export default function App() {
  const [addr, setAddr] = useState<string|null>(getAddress());
  const [connecting, setConnecting] = useState(false);
  useEffect(()=>{ setAddr(getAddress()); }, []);
  const onDisc = () => { disconnectAll(); setAddr(null); };

  const onConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      // discover EIP-6963 providers briefly, then connect selected provider directly (no modal)
      await new Promise<void>((resolve) => {
        const unsub = discoverProviders(() => {});
        setTimeout(() => { unsub(); resolve(); }, 250);
      });
      let providers = getProviders();
      if (providers.length === 0) {
        throw new Error("No wallet detected. Please install a browser wallet.");
      }
      // prefer a single specific provider to avoid conflicts; pick first announced
      const picked = providers[0];
      const res = await connectEvmProvider(picked);
      const gl = await connectWithEvmProvider(res.address, res.provider);
      setAddr(gl.address);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar address={addr} onDisconnect={onDisc} onConnectClick={onConnect} connecting={connecting} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/bounties" element={<Bounties connected={!!addr} />} />
          <Route path="/reputation" element={<Reputation connected={!!addr} />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
