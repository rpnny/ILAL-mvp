# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in ILAL Protocol, please report it responsibly:

### For Critical Issues

Email: 2867755637@qq.com  
Subject: [SECURITY] Brief description

We will respond within 24 hours.

### Bug Bounty Program

We offer rewards for security vulnerabilities:

- 🔴 **Critical** (funds at risk): $1,000
- 🟠 **High** (access control bypass): $600
- 🟡 **Medium** (logic errors): $300
- 🟢 **Low** (code quality): $200

See [docs/outreach/BUG_BOUNTY.md](./docs/outreach/BUG_BOUNTY.md) for details.

## Security Audits

- ✅ Internal audit completed (2026-02-11)
- 🔄 External audit: Pending
- ✅ Slither static analysis: Passed

Audit reports: [/audits](./audits)

## Responsible Disclosure

Please do NOT:
- ❌ Publicly disclose vulnerabilities before we've patched them
- ❌ Exploit vulnerabilities for personal gain
- ❌ Attack our infrastructure

Please DO:
- ✅ Report vulnerabilities privately
- ✅ Give us reasonable time to fix issues
- ✅ Work with us to understand the impact

## Security Best Practices

### For Users

1. **Never share your private keys**
2. **Verify contract addresses** before interacting
3. **Start with small amounts** on testnet
4. **Check session status** before trading

### For Developers

1. **Never commit `.env` files**
2. **Use environment variables** for secrets
3. **Run tests** before deploying
4. **Follow upgrade procedures** for UUPS contracts

## Known Limitations

See [docs/guides/ARCHITECTURE.md](./docs/guides/ARCHITECTURE.md) for:
- Testnet-only features (MockVerifier)
- Relay service dependency
- Session TTL considerations

## Contact

- Email: 2867755637@qq.com
- Twitter: @[your handle]
- Discord: [coming soon]

---

**Last Updated**: February 14, 2026
