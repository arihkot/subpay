# SubPay — Subscription & Recurring Payments on Stellar/Soroban

Decentralized subscription manager for recurring payments on Stellar testnet, powered by Soroban smart contracts. Authorize capped, time-bounded subscriptions and let merchants claim payments — fully on-chain and auditable.

## Deployed URL
https://subpay.pages.dev/

## Demo
<img width="1582" height="1035" alt="Screenshot 2026-07-04 at 5 37 51 PM" src="https://github.com/user-attachments/assets/ff960ec5-69b1-43d5-9615-05bc4076771e" />
<img width="1582" height="1035" alt="Screenshot 2026-07-04 at 5 36 48 PM" src="https://github.com/user-attachments/assets/e9cc3f80-db26-4ae8-9956-ac036303f5fe" />
<img width="1582" height="1035" alt="Screenshot 2026-07-04 at 5 36 33 PM" src="https://github.com/user-attachments/assets/e5f71866-bcc3-4b5b-93ec-11b1c7d334d2" />
<img width="1470" height="956" alt="Screenshot 2026-07-04 at 5 36 13 PM" src="https://github.com/user-attachments/assets/2257dcab-390a-4e5a-a9b9-8db8be3cfd00" />
<img width="1582" height="1035" alt="Screenshot 2026-07-04 at 5 35 43 PM" src="https://github.com/user-attachments/assets/c6c16a39-0ea2-49c5-8467-2f37287e5478" />
<img width="1582" height="1035" alt="Screenshot 2026-07-04 at 5 35 33 PM" src="https://github.com/user-attachments/assets/3982a854-cd62-476e-87dc-bba286f21687" />
<img width="1582" height="1035" alt="Screenshot 2026-07-04 at 5 35 22 PM" src="https://github.com/user-attachments/assets/d7237907-ad69-4006-8216-3c1c4b31ff8c" />

## Mobile Responsive
<img width="337" height="725" alt="Screenshot 2026-07-04 at 5 42 29 PM" src="https://github.com/user-attachments/assets/31133e2f-8a59-496f-b5ca-2d37f854ca6b" />
<img width="337" height="725" alt="Screenshot 2026-07-04 at 5 42 16 PM" src="https://github.com/user-attachments/assets/ced69cb8-8d41-4a39-a01e-568c2ffce62b" />
<img width="337" height="725" alt="Screenshot 2026-07-04 at 5 42 01 PM" src="https://github.com/user-attachments/assets/918ad3ec-3514-46c0-8ea8-53bfd7a8cf02" />
<img width="337" height="725" alt="Screenshot 2026-07-04 at 5 41 43 PM" src="https://github.com/user-attachments/assets/c560b49b-3f98-4f63-ae59-fc90ca30037f" />
<img width="337" height="725" alt="Screenshot 2026-07-04 at 5 41 31 PM" src="https://github.com/user-attachments/assets/422d9880-bc38-46ff-8d92-0990696826fa" />
<img width="337" height="725" alt="Screenshot 2026-07-04 at 5 41 21 PM" src="https://github.com/user-attachments/assets/41a4ad67-07e3-4e9c-ac74-f9a77697b754" />

## Demo Video
https://drive.google.com/file/d/1Mc9xtmHC8sIsj_1uxURkfTcEYaGuTEuV/view?usp=sharing

## CI/CD
<img width="1452" height="801" alt="image" src="https://github.com/user-attachments/assets/176e2c97-4664-4b05-bbef-21fbb74cfe0f" />

## Tests
<img width="683" height="365" alt="image" src="https://github.com/user-attachments/assets/31686cc9-64c4-48fc-b3ed-2f7f37e45823" />

## Pitch Deck
https://drive.google.com/file/d/12xZ7UQlibDpvYiNCD6OzOfGS9O1mi3_t/view?usp=sharing

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
