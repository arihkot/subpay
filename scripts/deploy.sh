#!/usr/bin/env bash
set -euo pipefail

# Deploy SubPay contract to Stellar Testnet
# Prerequisites: stellar CLI installed, funded account

CONTRACT_WASM="target/wasm32-unknown-unknown/release/subpay.wasm"
DEPLOYER_KEY="${DEPLOYER_SECRET:-}"
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"

if [ -z "${DEPLOYER_KEY:-}" ]; then
  echo "Set DEPLOYER_SECRET env var to a testnet-funded account secret key"
  exit 1
fi

echo "Building contract..."
cargo build --target wasm32-unknown-unknown --release 2>&1

if [ ! -f "$CONTRACT_WASM" ]; then
  echo "Wasm not found at $CONTRACT_WASM. Trying alternate path..."
  # Some setups output to target/wasm32v1-none/release/
  CONTRACT_WASM="target/wasm32v1-none/release/subpay.wasm"
  if [ ! -f "$CONTRACT_WASM" ]; then
    echo "Error: Cannot find compiled wasm"
    exit 1
  fi
fi

echo "Optimizing wasm..."
stellar contract optimize --wasm "$CONTRACT_WASM"

OPTIMIZED_WASM="${CONTRACT_WASM%.wasm}-optimized.wasm"

echo "Deploying to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$OPTIMIZED_WASM" \
  --source "$DEPLOYER_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL")
echo ""
echo "Contract deployed: $CONTRACT_ID"

echo "Installing contract..."
stellar contract install \
  --wasm "$OPTIMIZED_WASM" \
  --source "$DEPLOYER_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL"

echo ""
echo "Initializing with admin..."
DEPLOYER_PUBLIC=$(stellar keys address "$DEPLOYER_KEY" 2>/dev/null || echo "$DEPLOYER_KEY" | head -c 56)
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$DEPLOYER_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  -- initialize \
  --admin "$DEPLOYER_PUBLIC"

echo ""
echo "=== Deploy Complete ==="
echo "Contract Address: $CONTRACT_ID"
echo ""
echo "Next: update frontend/src/lib/contract.ts with this address"
