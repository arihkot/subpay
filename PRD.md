# Product Requirements Document — **SubPay**
### Subscription & Recurring Payments Manager on Stellar/Soroban

**Version:** 1.0 | **Status:** Draft | **Target Network:** Stellar Testnet

---

## 1. Overview

### 1.1 Problem Statement
Recurring payments (SaaS subscriptions, memberships, rent, payroll) are traditionally centralized, require trusting a third party to pull funds, and lack transparency. On-chain, there's no native "auto-debit" — you can't grant a merchant unlimited access to your wallet. SubPay solves this with an **allowance-and-claim** model: a user authorizes a capped, time-bounded subscription, and the merchant (or an automated relayer) claims each period's payment on schedule, fully on-chain and auditable.

### 1.2 Solution
A full-stack dApp where:
- **Subscribers** connect a wallet, browse/create subscriptions, fund a subscription vault, view active subscriptions, and cancel anytime.
- **Merchants** register a plan, and claim due payments.
- A **dashboard** gives a real-time view of active subscriptions, next-due dates, spend history, and links to on-chain proof (contract address + transaction hashes).

### 1.3 Why Stellar/Soroban
Stellar offers low fees (~0.00001 XLM base) and fast finality (~5s), ideal for micro-recurring payments. Soroban (Stellar's smart contract platform) provides Rust-based contracts with strong auth primitives (`require_auth`) perfect for the allowance model.

---

## 2. Goals & Success Criteria

| # | Requirement | Acceptance Criteria |
|---|-------------|---------------------|
| 1 | Freighter wallet connect | User can connect/disconnect; address & network shown; rejects on wrong network |
| 2 | Cloudflare deployment | Frontend live on `*.pages.dev` / Workers via Wrangler |
| 3 | Deployed contract address | Contract `C...` address surfaced in UI + README |
| 4 | Tx hash of a contract call | Every write op returns a hash, linked to Stellar Expert |
| 5 | Deploy contracts | Contracts deployed to testnet, reproducible via script |
| 6 | Mobile responsive | Usable at 320px–1440px+; passes Lighthouse mobile |
| 7 | CI/CD pipeline | GitHub Actions: lint → test → build → deploy on push |
| 8 | 5+ tests each | ≥5 Soroban contract tests + ≥5 frontend tests, all passing |
| 9 | 20+ commits | 20+ meaningful, scoped commits |
| 10 | 55 seeded testnet users | 55 distinct accounts interacting organically; seed files gitignored |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Cloudflare (Wrangler)                    │
│   React + Vite + Tailwind SPA  →  Pages/Workers deploy      │
└───────────────┬──────────────────────────┬────────────────┘
                │ @stellar/freighter-api    │ @stellar/stellar-sdk
                ▼                            ▼
        ┌───────────────┐          ┌──────────────────────┐
        │  Freighter    │          │  Soroban RPC (testnet)│
        │  Wallet ext.  │          │  soroban-testnet.     │
        └───────────────┘          │  stellar.org          │
                                   └──────────┬───────────┘
                                              ▼
                              ┌───────────────────────────┐
                              │  SubPay Contract (Wasm)    │
                              │  - create_plan             │
                              │  - subscribe / fund_vault  │
                              │  - claim_payment           │
                              │  - cancel_subscription     │
                              └───────────────────────────┘
```

**Tech Stack**
- **Contracts:** Rust + `soroban-sdk`, built to `wasm32v1-none`, deployed via **Stellar CLI** (`stellar contract deploy`).
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS, `@stellar/stellar-sdk`, `@stellar/freighter-api`. (Optional: **Stellar Wallets Kit** for multi-wallet + mobile WalletConnect support.)
- **Hosting:** Cloudflare Pages/Workers via Wrangler.
- **CI/CD:** GitHub Actions.
- **Testing:** Rust `#[test]` + Soroban test env for contracts; Vitest + React Testing Library for frontend.
- **Seeding:** Node/TS script using Friendbot + generated keypairs.

---

## 4. Smart Contract Specification

### 4.1 Data Model

```rust
// Plan created by a merchant
pub struct Plan {
    id: u64,
    merchant: Address,
    token: Address,        // e.g. testnet USDC or native-wrapped XLM
    amount: i128,          // per-period charge
    period: u64,           // seconds between charges (e.g. 2592000 = 30 days)
    name: Symbol,
    active: bool,
}

// A user's subscription to a plan
pub struct Subscription {
    id: u64,
    subscriber: Address,
    plan_id: u64,
    vault_balance: i128,   // prepaid funds held for claims
    next_due: u64,         // ledger timestamp of next claimable payment
    active: bool,
    created_at: u64,
}
```

### 4.2 Functions

| Function | Auth | Description |
|----------|------|-------------|
| `initialize(admin)` | — | One-time setup |
| `create_plan(merchant, token, amount, period, name)` | `merchant` | Merchant registers a plan; returns `plan_id` |
| `subscribe(subscriber, plan_id)` | `subscriber` | Creates a subscription; returns `sub_id` |
| `fund_vault(subscriber, sub_id, amount)` | `subscriber` | Transfers tokens into the subscription vault |
| `claim_payment(caller, sub_id)` | `caller` | If `now >= next_due` and vault funded, transfers `amount` to merchant, advances `next_due += period` |
| `cancel_subscription(subscriber, sub_id)` | `subscriber` | Deactivates; refunds remaining vault balance |
| `get_subscription(sub_id)` | — | Read-only |
| `list_subscriptions(subscriber)` | — | Read-only, for dashboard |

### 4.3 Key Rules
- `claim_payment` reverts if `now < next_due` (prevents early/double charging) or if `vault_balance < amount`.
- Cancellation refunds unused prepaid funds — trust-minimized.
- All state writes emit **events** (`plan_created`, `subscribed`, `payment_claimed`, `cancelled`) for dashboard indexing.

---

## 5. Frontend Feature Spec

### 5.1 Pages
1. **Landing / Connect** — hero, "Connect Freighter" CTA, network badge.
2. **Dashboard** (`/dashboard`)
   - Cards: Total Active Subscriptions, Monthly Spend, Next Payment Due.
   - Table of active subscriptions: plan name, amount, next-due countdown, vault balance, status, actions (Fund / Cancel).
   - Each row links to Stellar Expert via **tx hash**.
3. **Browse / Create Plan** (`/plans`) — merchant creates a plan; users subscribe.
4. **Subscription Detail** (`/subscription/:id`) — payment history, contract address, all tx hashes.
5. **Footer** — displays **deployed contract address** globally.

### 5.2 Wallet Flow
- Detect Freighter (`isConnected`), request access, fetch `address` + `network`.
- Guard: if network ≠ TESTNET, show a switch-network prompt.
- Sign transactions with `signTransaction`, submit via Soroban RPC, capture and display the returned **tx hash**.

### 5.3 Responsive Design
- Tailwind breakpoints: mobile-first, table collapses to stacked cards below `md`.
- Touch targets ≥44px; tested 320px → 1440px.

---

## 6. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml (conceptual)
Jobs:
  contracts:
    - Install Rust + wasm32v1-none target + Stellar CLI
    - cargo fmt --check, cargo clippy
    - cargo test            # ≥5 contract tests
    - stellar contract build

  frontend:
    - Setup Node 20
    - npm ci
    - npm run lint
    - npm run test          # Vitest, ≥5 tests
    - npm run build

  deploy:                    # only on main, needs: [contracts, frontend]
    - Cloudflare Pages/Workers deploy via wrangler-action
    - Uses CLOUDFLARE_API_TOKEN secret
```

---

## 7. Testing Plan

### 7.1 Contract Tests (Rust, ≥5)
1. `test_create_plan` — plan stored, correct fields.
2. `test_subscribe_and_fund` — vault balance increments.
3. `test_claim_before_due_fails` — reverts when not yet due.
4. `test_claim_transfers_and_advances` — merchant receives funds, `next_due` advances one period.
5. `test_cancel_refunds_vault` — remaining balance returned.
6. `test_claim_insufficient_vault_fails` — reverts when underfunded.

### 7.2 Frontend Tests (Vitest + RTL, ≥5)
1. Renders Connect button when wallet disconnected.
2. Shows address + network after mock connect.
3. Dashboard renders subscription rows from mocked contract data.
4. Wrong-network guard displays switch prompt.
5. Tx-hash link renders correct Stellar Expert URL.
6. Cancel action triggers signing flow (mocked).

---

## 8. Testnet User Seeding (55 users) — Requirement #10

**Goal:** 55 distinct testnet accounts interact with the contract in a way that looks organic (not batch-generated in one timestamp burst).

**Approach** (script kept **out of git** via `.gitignore`):
```
scripts/seed.ts          # gitignored
.env.seed                # gitignored (funded accounts)
data/seed-accounts.json  # gitignored (keypairs)
```

**To avoid an "artificially seeded" look:**
- Generate 55 keypairs; fund each via **Friendbot**.
- **Randomize behavior per user:** vary which plans they subscribe to, vault funding amounts, number of `fund_vault` / `claim` calls, and whether some cancel.
- **Spread timing:** insert randomized delays (jitter) between actions and across a realistic window, rather than one synchronous loop — avoids identical `created_at` clusters.
- **Vary plan mix:** create 4–6 different plans (e.g. "Netflix-style", "Gym", "SaaS Pro", "Newsletter") with different amounts/periods so subscriptions aren't uniform.
- Some users subscribe to multiple plans; some to one; a few cancel — creating a natural distribution.

> **`.gitignore` must include** the seed script, generated keypairs, and any `.env` with funded secrets. Never commit secret keys.

---

## 9. Commit Strategy (20+ meaningful commits)

Structure commits by scope so history tells a real story:
1. `chore: init monorepo (contracts + frontend)`
2. `feat(contract): plan data model & create_plan`
3. `feat(contract): subscribe & fund_vault`
4. `feat(contract): claim_payment with due checks`
5. `feat(contract): cancel_subscription + refunds`
6. `feat(contract): emit events`
7. `test(contract): create_plan & subscribe tests`
8. `test(contract): claim/cancel/edge-case tests`
9. `chore(contract): deploy script + testnet deploy`
10. `feat(fe): Freighter connect flow`
11. `feat(fe): network guard`
12. `feat(fe): dashboard layout + cards`
13. `feat(fe): subscription table + actions`
14. `feat(fe): plans page & create-plan form`
15. `feat(fe): subscription detail + tx hash links`
16. `style(fe): mobile responsive pass`
17. `test(fe): wallet + dashboard tests`
18. `test(fe): guard + tx-link tests`
19. `ci: add GitHub Actions (lint/test/build)`
20. `ci: Cloudflare deploy job`
21. `docs: README with contract address + tx hash`
22. `fix: <real bug you hit>`
23. `refactor: extract contract client hook`

*(Make commits incrementally as you build — don't backfill 20 fake commits at the end.)*

---

## 10. Deliverables Checklist

- [ ] Deployed contract address (`C...`) in README + UI footer
- [ ] At least one contract-call tx hash documented + linked
- [ ] Live Cloudflare URL
- [ ] Freighter connect working on testnet
- [ ] Mobile responsive (320–1440px)
- [ ] GitHub Actions green (lint/test/build/deploy)
- [ ] ≥5 contract tests + ≥5 frontend tests passing
- [ ] 20+ commits
- [ ] 55 seeded users (files gitignored, organic distribution)

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Testnet reset wipes contract/accounts | Deploy script is reproducible; re-run seeding |
| Freighter not installed on user's browser | Graceful `isConnected` detection + install prompt; consider Stellar Wallets Kit for mobile |
| Seeding looks synthetic | Randomize amounts, timing jitter, plan mix, and per-user action counts |
| Secrets leaked in commits | Enforce `.gitignore` + pre-commit secret scan; use GitHub Secrets for CI |
| Token for payments | Use a testnet SAC (Stellar Asset Contract) for XLM or deploy a mock token for tests |
