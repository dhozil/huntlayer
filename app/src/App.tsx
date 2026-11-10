import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ConnectModal } from "@/components/ConnectModal";
import Landing from "@/pages/Landing";
import HowItWorks from "@/pages/HowItWorks";
import Bounties from "@/pages/Bounties";
import Reputation from "@/pages/Reputation";
import { getAddress, disconnect } from "@/services/genlayer";

function Footer() {
  return (
    <footer className="border-t border-border/60 mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <div>HuntLayer — Automated Bug Bounties on GenLayer Studionet</div>
        <div className="flex gap-4"><a className="hover:text-foreground" href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer Docs</a><a className="hover:text-foreground" href="https://studio.genlayer.com" target="_blank" rel="noreferrer">Studio</a></div>
      </div>
    </footer>
  );
}

export default function App() {
  const [addr, setAddr] = useState<string|null>(getAddress());
  const [modal, setModal] = useState(false);
  useEffect(()=>{ setAddr(getAddress()); }, []);
  const onDisc = () => { disconnect(); setAddr(null); };
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar address={addr} onDisconnect={onDisc} onConnectClick={()=>setModal(true)} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/bounties" element={<Bounties connected={!!addr} />} />
          <Route path="/reputation" element={<Reputation connected={!!addr} />} />
        </Routes>
      </main>
      <Footer />
      <ConnectModal open={modal} onClose={()=>setModal(false)} onConnected={(a)=>setAddr(a)} />
    </div>
  );
}
