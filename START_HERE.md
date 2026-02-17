# ILAL Quick Start

This file provides the shortest path to get up and running. For complete documentation, see `docs/INDEX.md`.

---

## 1) Project Initialization (Monorepo)

```bash
cd ~/Desktop/ilal
pnpm install
pnpm build
```

---

## 2) Local Development (Recommended Order)

### Start Web Demo
```bash
cd apps/web-demo
npm run dev
```

### Start API (Optional, but recommended)
```bash
cd apps/api
cp .env.example .env
npm run dev
```

### Start Bot (Optional)
```bash
cd bot
npm run dev
```

---

## 3) Deployment & System Testing

### One-Click Deployment
```bash
cd ~/Desktop/ilal
./complete-deployment.sh
```

### System Test (Mock Theater)
```bash
cd scripts/system-test
./run-theater.sh
```

---

## 4) Recommended Reading Order

- Documentation Index: `docs/INDEX.md`
- SDK Documentation: `packages/sdk/README.md`
- Architecture Guide: `docs/guides/ARCHITECTURE.md`
- Deployment Guide: `docs/guides/DEPLOYMENT.md`

---

## Note

The project is migrating from the legacy directory structure to a Monorepo structure:

- Legacy: `frontend/`, `contracts/`, `circuits/`, `relay/`
- New: `apps/*`, `packages/*`

Please use the new paths for development and script execution.
