#!/usr/bin/env bash
# Build, deploy, and initialize the savings-vault contract on Stellar testnet.
#
# Usage:
#   SOURCE_ACCOUNT=alice ./scripts/deploy_testnet.sh
#
# Required env vars:
#   SOURCE_ACCOUNT  Stellar CLI identity that pays for and signs the deploy
#                    and initialize transactions. Must be funded on testnet.
#                    Create one with:
#                      stellar keys generate --fund --network testnet alice
#
# Optional env vars:
#   ADMIN_ACCOUNT     Address to set as the vault admin (default: SOURCE_ACCOUNT's address).
#   TOKEN_CONTRACT_ID  Contract id of an already-deployed SEP-41 token to use
#                       as the vault's token, skipping asset wrapping entirely.
#   TEST_ASSET         Classic Stellar asset to wrap as the vault's test token,
#                       in "CODE:ISSUER" form (default: "native", i.e. XLM —
#                       always available on testnet with no setup required).
#   STELLAR_NETWORK     Network passed to the Stellar CLI (default: testnet).
set -euo pipefail

: "${SOURCE_ACCOUNT:?Set SOURCE_ACCOUNT to a funded Stellar CLI identity name (see script header)}"

NETWORK="${STELLAR_NETWORK:-testnet}"
TEST_ASSET="${TEST_ASSET:-native}"

cd "$(dirname "$0")/.."

WASM="target/wasm32-unknown-unknown/release/savings_vault.wasm"
WASM_OUT="target/wasm32-unknown-unknown/release/savings_vault.optimized.wasm"

echo "==> Building release wasm"
cargo build --target wasm32-unknown-unknown --release

echo "==> Optimizing wasm"
stellar contract optimize --wasm "$WASM" --wasm-out "$WASM_OUT"

echo "==> Deploying contract to $NETWORK"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_OUT" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK")

ADMIN_ADDRESS="${ADMIN_ACCOUNT:-$(stellar keys public-key "$SOURCE_ACCOUNT")}"

if [ -z "${TOKEN_CONTRACT_ID:-}" ]; then
  echo "==> Wrapping test token asset ($TEST_ASSET) as a Stellar Asset Contract"
  TOKEN_CONTRACT_ID=$(stellar contract asset deploy \
    --asset "$TEST_ASSET" \
    --source "$SOURCE_ACCOUNT" \
    --network "$NETWORK")
fi

echo "==> Initializing vault"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --token "$TOKEN_CONTRACT_ID"

echo ""
echo "Deployed savings-vault to $NETWORK"
echo "  Contract ID: $CONTRACT_ID"
echo "  Token ID:    $TOKEN_CONTRACT_ID"
echo "  Admin:       $ADMIN_ADDRESS"
