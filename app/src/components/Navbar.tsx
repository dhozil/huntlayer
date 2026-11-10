import { Link, NavLink } from "react-router-dom";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getAddress, disconnect } from "@/services/genlayer";

export function Navbar({ address, onDisconnect, onConnectClick }: { address: string|null; onDisconnect: ()=>void; onConnectClick: ()=>void }) {
  const [open, setOpen] = useState(false);
  const link = ({isActive}:{isActive:boolean}) => `px-3 py-2 rounded-md text-sm font-medium transition ${isActive?"text-primary bg-primary/10":"text-muted-foreground hover:text-foreground hover:bg-muted/50"}`;
  const links = [
    {to:"/", label:"Home"},
    {to:"/how-it-works", label:"How it Works"},
    {to:"/bounties", label:"Bounties"},
    {to:"/reputation", label:"Reputation"},
  ];
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Shield className="h-4 w-4"/></span>
            <span>Hunt<span className="text-primary">Layer</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(l=> <NavLink key={l.to} to={l.to} className={link} end={l.to==="/"}>{l.label}</NavLink>)}
          </div>
          <div className="hidden md:flex items-center gap-2">
            {address ? (
              <>
                <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">{address.slice(0,6)}...{address.slice(-4)}</span>
                <Button variant="outline" size="sm" onClick={onDisconnect}>Disconnect</Button>
              </>
            ) : <Button size="sm" onClick={onConnectClick}>Connect Wallet</Button>}
          </div>
          <button className="md:hidden p-2" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/60 px-4 py-3 space-y-1 bg-background">
          {links.map(l=> <NavLink key={l.to} to={l.to} className={link} end={l.to==="/"} onClick={()=>setOpen(false)}>{l.label}</NavLink>)}
          <div className="pt-2">
            {address ? <Button variant="outline" size="sm" className="w-full" onClick={()=>{onDisconnect();setOpen(false)}}>Disconnect {address.slice(0,6)}...</Button>
            : <Button size="sm" className="w-full" onClick={()=>{onConnectClick();setOpen(false)}}>Connect Wallet</Button>}
          </div>
        </div>
      )}
    </nav>
  );
}
