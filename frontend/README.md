# HuntLayer Frontend (Complete)

React + Vite + TypeScript + Tailwind (shadcn structure) frontend for HuntLayer on GenLayer Studionet.

## Features
- Landing (HuntLayer-themed magnified bento hero), How it Works, Bounties dashboard, Reputation
- **EVM wallet connect (EIP-6963)**: discovers injected providers and connects only the selected one — avoids multiple wallets fighting over popups
- **GenLayer signing (genlayer-js)**: connect with a **real wallet** private key or an EVM provider (doc-aligned) for read/write txs on Studionet — **no demo/generated keys, no mock data, 100% on-chain**
- Full contract integration: create/fund/submit/evaluate/release/close/reopen/close_if_expired + views
- Tx UX: pending/success/error, tx hash, copy, Studio link, clear error/success handling
- Config: `src/lib/config.ts` (contract `0x829068c07fDe9f71f5b41b3ef5423A141Ea46beF`)

## Setup
```bash
cd frontend
npm install
npm run dev
```
Build: `npm run build && npm run preview`

## Notes
- Amounts in wei (1 GEN = 10^18). Consensus ops (evaluate/release) take time.
- Use **real** funded wallets only. Never use mainnet keys on Studionet. All displayed data is fetched on-chain.
