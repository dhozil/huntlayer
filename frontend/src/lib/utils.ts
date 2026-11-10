import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export function shortAddr(a?: string | null) { if (!a) return ""; return `${a.slice(0,6)}...${a.slice(-4)}`; }
export function fmtWei(v: any) { try { const n = BigInt(v ?? 0); const eth = Number(n) / 1e18; return `${eth.toLocaleString(undefined,{maximumFractionDigits:6})} GEN`; } catch { return String(v); } }
