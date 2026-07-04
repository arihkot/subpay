# SubPay — Subscription & Recurring Payments on Stellar/Soroban

Decentralized subscription manager for recurring payments on Stellar testnet, powered by Soroban smart contracts. Authorize capped, time-bounded subscriptions and let merchants claim payments — fully on-chain and auditable.

## Contract

**Network:** Stellar Testnet  
**Contract Address:** [`CAKSVSIOWRSRYHH25EMS7IZAM76HK4YAFEFXYPDA5FAQR3NV2WAIYBNR`](https://stellar.expert/explorer/testnet/contract/CAKSVSIOWRSRYHH25EMS7IZAM76HK4YAFEFXYPDA5FAQR3NV2WAIYBNR)  
**Deploy Tx:** [`9fae148e...`](https://stellar.expert/explorer/testnet/tx/9fae148e17e3a1a0ec14249dd3892759ccf13f6130a73825691c08ba27a111)  
**Init Tx:** [`f56294d3...`](https://stellar.expert/explorer/testnet/tx/f56294d3f9188a94d2ec0ebaee5d4dfb2f3a32fbe22060128f0fcdaea7b53512)  
**Live:** [`https://subpay.pages.dev`](https://subpay.pages.dev)

## Features

- **Allowance Model**: Pre-approve capped, time-bounded subscriptions — never expose your wallet
- **Freighter Wallet**: Connect with Freighter browser extension on Stellar Testnet
- **Dashboard**: Real-time view of active subscriptions, monthly spend, next due dates
- **Browse & Create Plans**: Merchants register plans; users browse and subscribe
- **Payment History**: Every payment linked to on-chain tx hash with Stellar Expert links
- **Trust-Minimized Cancellation**: Cancel anytime, unused prepaid funds refunded

## Feedback Form
https://docs.google.com/forms/d/e/1FAIpQLSdlWq1o723XapPdiOq9h1viVGqY-x-c7yRv9ntwJrZpYq7sEg/viewform?usp=publish-editor

## Feedback Responses
https://docs.google.com/spreadsheets/d/1Rk1Y8P_xq9-qSYhwaq-YUSMxRH7gw3XF-LJf1OIm2EY/edit?usp=sharing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Rust + `soroban-sdk` (Wasm) |
| Frontend | React 18 + Vite + TypeScript + TailwindCSS |
| Wallet | `@stellar/freighter-api` |
| Network | Stellar Testnet (Soroban RPC) |
| Hosting | Cloudflare Pages (via Wrangler) |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
- [Freighter Browser Extension](https://freighter.app/) (set to Testnet)

### Install

```bash
# Frontend
cd frontend
npm install

# Contracts
cd contracts
cargo build
```

### Develop

```bash
# Frontend dev server
cd frontend && npm run dev

# Contract tests
cd contracts && cargo test
```

### Deploy Contract

```bash
cd contracts
DEPLOYER_SECRET=S... ./scripts/deploy.sh
```

### Run Tests

```bash
# Contracts (≥6 tests)
cd contracts && cargo test

# Frontend (≥6 tests)
cd frontend && npm run test
```

## Project Structure

```
subpay/
├── contracts/           # Soroban smart contract
│   ├── src/lib.rs       # Contract implementation
│   └── tests/test.rs    # Contract tests
├── frontend/            # React SPA
│   └── src/
│       ├── components/  # Navbar, Footer
│       ├── pages/       # Landing, Dashboard, Plans, SubscriptionDetail
│       ├── hooks/       # useWallet
│       └── lib/         # contract config, WalletContext
├── scripts/             # Deploy scripts
├── .github/workflows/   # CI/CD pipeline
└── PRD.md               # Product Requirements
```

## License

MIT
