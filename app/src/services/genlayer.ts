import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { CONTRACT_ADDRESS } from "@/lib/config";

let _account: any = null;
let _client: any = null;

export function getAccount() { return _account; }
export function getClient() { return _client; }
export function getAddress(): string | null { return _account?.address ?? null; }

export function connectWithPrivateKey(pk: string) {
  const key = pk.startsWith("0x") ? pk : `0x${pk}`;
  _account = createAccount(key as `0x${string}`);
  _client = createClient({ chain: studionet as any, account: _account });
  return _account.address as string;
}

export function connectRandom() {
  _account = createAccount();
  _client = createClient({ chain: studionet as any, account: _account });
  return _account.address as string;
}

export function disconnect() {
  _account = null; _client = null;
}

function ensure() {
  if (!_client) throw new Error("Wallet not connected. Connect a wallet first.");
  return _client;
}

export async function waitForTx(hash: string) {
  const client = ensure();
  // try common methods
  if (typeof client.waitForTransactionReceipt === "function") return client.waitForTransactionReceipt({ hash });
  if (typeof client.waitForTransactionReceipt === "function") return client.waitForTransactionReceipt(hash);
  throw new Error("waitForTransactionReceipt not available");
}

export async function readContract(functionName: string, args: any[] = []) {
  const client = ensure();
  return client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args });
}

export async function writeContract(functionName: string, args: any[] = [], value?: bigint) {
  const client = ensure();
  const txHash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args, value });
  return txHash as string;
}

export { CONTRACT_ADDRESS };
