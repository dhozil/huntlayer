# HuntLayer Frontend

React + Vite + TypeScript + Tailwind frontend for the HuntLayer Intelligent Contract on GenLayer Studionet.

## Setup

```bash
cd app
npm install
npm run dev
```

Build:
```bash
npm run build
npm run preview
```

## Config
- Contract address & network: `src/lib/config.ts` (default points to deployed studionet contract).
- Wallet: connect via private key (demo/studionet) or generate ephemeral account in the UI.

## Features
- Landing with HuntLayer-themed hero (magnified bento), features, CTAs
- How it Works (protocol flow, severity, consensus)
- Bounties dashboard: create/fund/submit/evaluate/release/close/reopen/expire + load bounty & submissions
- Reputation lookup (points, merges, total earned)
- Tx status handling (pending/success/error, tx hash, explorer/Studio link)
- Responsive, dark professional theme
