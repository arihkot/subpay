#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/../contracts"

CONTRACT_WASM="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/subpay.wasm"
OPTIMIZED_WASM="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/subpay.optimized.wasm"
DEPLOYER_KEY="${DEPLOYER_SECRET:-}"
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

if [ -z "${DEPLOYER_KEY:-}" ]; then
  echo "Set DEPLOYER_SECRET env var to a testnet-funded account secret key"
  exit 1
fi

echo "Building contract..."
(cd "$CONTRACTS_DIR" && cargo build --target wasm32-unknown-unknown --release) 2>&1

if [ ! -f "$CONTRACT_WASM" ]; then
  echo "Wasm not found at $CONTRACT_WASM"
  exit 1
fi

echo "Optimizing wasm..."
stellar contract optimize --wasm "$CONTRACT_WASM"

if [ ! -f "$OPTIMIZED_WASM" ]; then
  echo "Optimized wasm not found at $OPTIMIZED_WASM"
  exit 1
fi

echo "Deploying to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$OPTIMIZED_WASM" \
  --source "$DEPLOYER_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")
echo ""
echo "Contract deployed: $CONTRACT_ID"
echo "Tx: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"

echo "Initializing contract..."
DEPLOYER_PUBLIC=$(stellar keys address "$DEPLOYER_KEY" 2>/dev/null || echo "$DEPLOYER_KEY")
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$DEPLOYER_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- initialize \
  --admin "$DEPLOYER_PUBLIC"

echo ""
echo "=== Deploy Complete ==="
echo "Contract Address: $CONTRACT_ID"
echo ""
echo "Next: add to frontend/.env:"
echo "VITE_CONTRACT_ID=$CONTRACT_ID"
