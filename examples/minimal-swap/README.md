# ILAL Minimal Swap Example

A single-file TypeScript example that goes from zero to a successful on-chain WETH→tUSDC swap on Base Sepolia.

## Prerequisites

- Node.js >= 18
- An ILAL API key (create one at https://ilal.tech/dashboard/api-keys)
- A Base Sepolia wallet with some ETH for gas and WETH for the swap

## Run

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in your credentials
cp .env.example .env

# 3. Run
npm start
```

## What it does

1. **Health check** — verifies the API is reachable
2. **Register** — onboards your wallet (mock KYC, auto-approved)
3. **Activate session** — starts a 24h compliance session on-chain
4. **Preflight** — checks balances, allowances, and session status
5. **Build swap** — gets unsigned WETH→tUSDC swap transaction from the API
6. **Sign & broadcast** — signs with your wallet and sends to Base Sepolia
7. **Verify** — waits for confirmation and prints the explorer link
