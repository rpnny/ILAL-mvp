#!/bin/bash

# ILAL Circuit Compilation Script

set -e

echo "Compiling ILAL compliance circuit..."

if ! command -v circom &> /dev/null; then
    echo "Error: Circom not installed. Run: cargo install circom"
    exit 1
fi

echo "Circom version: $(circom --version)"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CIRCUIT_DIR="$(dirname "$SCRIPT_DIR")"

# Resolve circomlib include path: prefer local node_modules, fall back to parent
if [ -d "$CIRCUIT_DIR/node_modules/circomlib/circuits" ]; then
    CIRCOMLIB_PATH="$CIRCUIT_DIR/node_modules/circomlib/circuits"
elif [ -d "$CIRCUIT_DIR/../../node_modules/circomlib/circuits" ]; then
    CIRCOMLIB_PATH="$CIRCUIT_DIR/../../node_modules/circomlib/circuits"
else
    echo "Error: circomlib not found. Run 'npm install' in packages/circuits/"
    exit 1
fi

echo "Using circomlib at: $CIRCOMLIB_PATH"

mkdir -p "$CIRCUIT_DIR/build"

echo ""
echo "Compiling compliance.circom..."
circom "$CIRCUIT_DIR/compliance.circom" \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -o "$CIRCUIT_DIR/build" \
    -l "$CIRCOMLIB_PATH"

echo ""
echo "Compilation complete!"
echo ""
echo "Circuit info:"
npx snarkjs r1cs info "$CIRCUIT_DIR/build/compliance.r1cs"

echo ""
echo "Output files:"
ls -lh "$CIRCUIT_DIR/build/"

echo ""
echo "Next steps:"
echo "  1. Run ./setup.sh for PLONK trusted setup"
echo "  2. Run node generate-test-proof.js to generate a test proof"
