import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { CONTRACT_ADDRESS } from "@/lib/config";

export type GlState = { account: any | null; client: any | null; mode: "key" | "provider" | "evm-display" | "none"; evmAddress?: string };
let state: GlState = { account: null, client: null, mode: "none" };

export function getState() { return state; }
export function getClient() { return state.client; }
export function getAddress() { return (state.account?.address as string | undefined) ?? state.evmAddress ?? null; }

export function connectWithPrivateKey(pk: string) {
  const key = pk.startsWith("0x") ? pk : `0x${pk}`;
  const account = createAccount(key as `0x${string}`);
  const client = createClient({ chain: studionet as any, account });
  state = { account, client, mode: "key" };
  return { address: account.address as string, mode: "key" as const };
}

// Demo/random account generation is intentionally disabled: use a real wallet key or EVM provider.

// Doc-aligned browser wallet: createClient with address + EIP-1193 provider, then connect chain
export async function connectWithEvmProvider(address: string, provider: any) {
  const client = createClient({ chain: studionet as any, account: address as `0x${string}`, provider });
  try {
    if (typeof (client as any).connect === "function") {
      await (client as any).connect("studionet");
    }
  } catch {
    // some versions/chains may not require explicit connect; continue
  }
  state = { account: { address }, client, mode: "provider", evmAddress: address };
  return { address, mode: "provider" as const };
}

export function setEvmDisplay(address: string) {
  state = { ...state, evmAddress: address, mode: state.client ? state.mode : "evm-display" };
}
export function disconnectAll() { state = { account: null, client: null, mode: "none" }; }

function ensureClient() {
  if (!state.client) throw new Error("GenLayer signing account not connected. Connect with your real wallet key or an EVM provider to sign transactions.");
  return state.client;
}

export async function readContract(functionName: string, args: any[] = []) {
  const client = ensureClient();
  return client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args });
}

export async function writeContract(functionName: string, args: any[] = [], value?: bigint) {
  const client = ensureClient();
  const base: any = { address: CONTRACT_ADDRESS as `0x${string}`, functionName, args };
  if (value !== undefined) base.value = value;
  // Doc-aligned: try fee estimation for fee-charging deployments, fallback for gasless/studionet
  try {
    if (typeof client.estimateTransactionFeesForWrite === "function") {
      const estimate = await client.estimateTransactionFeesForWrite(base);
      if (estimate?.feeValue !== undefined && estimate?.distribution) {
        base.fees = { distribution: estimate.distribution, feeValue: estimate.feeValue };
      }
    }
  } catch {
    // estimation may fail or be unnecessary; proceed without explicit fees
  }
  const txHash = await client.writeContract(base);
  return txHash as string;
}

export async function waitForTransactionReceipt(hash: string) {
  const client = ensureClient();
  // prefer doc-recommended waits when available
  if (typeof client.waitForFinalization === "function") {
    try { return await client.waitForFinalization({ hash }); } catch {}
  }
  if (typeof client.waitForDecision === "function") {
    try { return await client.waitForDecision({ hash }); } catch {}
  }
  if (typeof client.waitForTransactionReceipt === "function") {
    try { return await client.waitForTransactionReceipt({ hash }); } catch { return await client.waitForTransactionReceipt(hash); }
  }
  throw new Error("No wait method available on client");
}

export async function getTransaction(hash: string) {
  const client = ensureClient();
  if (typeof client.getTransaction === "function") {
    try { return await client.getTransaction({ hash }); } catch {}
  }
  if (typeof client.getTransactionReceipt === "function") {
    try { return await client.getTransactionReceipt({ hash }); } catch {}
  }
  return null;
}

export function isTxSuccessful(tx: any): boolean {
  if (!tx) return false;
  if (typeof tx === "object") {
    // best-effort: check common success indicators
    if (tx.txExecutionResultName === "FINISHED_WITH_RETURN") return true;
    if (tx.execution_result === "SUCCESS" || tx.executionResult === "SUCCESS") return true;
    const s = String(tx.statusName || tx.status || "").toUpperCase();
    if (s.includes("ACCEPTED") || s.includes("FINALIZED")) return true;
  }
  return false;
}

export async function simulateWrite(functionName: string, args: any[] = []) {
  const client = ensureClient();
  if (typeof client.simulateWriteContract === "function") {
    return client.simulateWriteContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args });
  }
  return null;
}

export function getChainInfo() {
  return { chain: studionet, contract: CONTRACT_ADDRESS, network: "studionet" };
}

export { CONTRACT_ADDRESS };
export const waitForTx = waitForTransactionReceipt;

