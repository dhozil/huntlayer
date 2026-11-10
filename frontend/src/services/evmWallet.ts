// EIP-6963 provider discovery to avoid multiple injected wallets fighting over window.ethereum
export interface EIP6963ProviderInfo {
  uuid: string; name: string; icon: string; rdns: string;
}
export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}
export interface EIP6963AnnounceEvent extends CustomEvent { detail: EIP6963ProviderDetail; }

const providers: Map<string, EIP6963ProviderDetail> = new Map();
let listeners: Array<() => void> = [];

export function discoverProviders(onChange?: () => void): () => void {
  const handler = (event: Event) => {
    const e = event as EIP6963AnnounceEvent;
    if (e?.detail?.info?.uuid) {
      providers.set(e.detail.info.uuid, e.detail);
      onChange?.();
    }
  };
  window.addEventListener("eip6963:announceProvider", handler as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  const unsub = () => window.removeEventListener("eip6963:announceProvider", handler as EventListener);
  if (onChange) listeners.push(onChange);
  return unsub;
}

export function getProviders(): EIP6963ProviderDetail[] {
  // fallback: include window.ethereum if no EIP-6963 announced
  if (providers.size === 0 && (window as any).ethereum) {
    return [{ info: { uuid: "injected", name: "Injected Wallet", icon: "", rdns: "injected" }, provider: (window as any).ethereum }];
  }
  return Array.from(providers.values());
}

export async function connectEvmProvider(detail: EIP6963ProviderDetail): Promise<{ address: string; chainId?: string; provider: any }> {
  const provider = detail.provider;
  // request accounts only on selected provider (no popup fight)
  const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
  const chainId: string = await provider.request({ method: "eth_chainId" }).catch(() => "");
  return { address: accounts[0], chainId, provider };
}

export async function getAccounts(provider: any): Promise<string[]> {
  try { return await provider.request({ method: "eth_accounts" }); } catch { return []; }
}

export function onAccountsChanged(provider: any, cb: (accs: string[]) => void) {
  provider?.on?.("accountsChanged", cb);
  return () => provider?.removeListener?.("accountsChanged", cb);
}
export function onChainChanged(provider: any, cb: (chainId: string) => void) {
  provider?.on?.("chainChanged", cb);
  return () => provider?.removeListener?.("chainChanged", cb);
}
