# Contributing to ILAL

Thank you for your interest in contributing to ILAL! 🎉

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Foundry (for smart contracts)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/[your-username]/ilal.git
cd ilal

# Install dependencies
cd contracts && forge install
cd ../frontend && npm install
cd ../circuits && npm install
cd ../bot && npm install

# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local

# Run tests
cd contracts && forge test
cd ../frontend && npm test
```

## Development Workflow

### Branches

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add session renewal feature
fix: resolve reentrancy issue in ComplianceHook
docs: update architecture documentation
test: add E2E tests for liquidity operations
chore: update dependencies
```

### Pull Request Process

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, documented code
   - Add tests for new features
   - Update documentation

3. **Run tests**
   ```bash
   cd contracts && forge test
   cd ../frontend && npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Wait for review**
   - Address review comments
   - Keep PR focused and small

## Code Standards

### Solidity

- Use Solidity 0.8.26
- Follow [OpenZeppelin style guide](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20)
- Add NatSpec comments
- Use custom errors (not `require` strings)
- Write unit tests for all functions

Example:
```solidity
/// @notice Starts a new session for a verified user
/// @param user The user address
/// @param expiry Session expiration timestamp
/// @dev Only callable by VERIFIER_ROLE
function startSession(address user, uint256 expiry) external;
```

### TypeScript/React

- Use TypeScript strict mode
- Follow React hooks best practices
- Add JSDoc comments for complex functions
- Use meaningful variable names

Example:
```typescript
/**
 * Checks if user has an active session
 * @param userAddress - User's Ethereum address
 * @returns Session status and remaining time
 */
export function useSession(userAddress: Address) {
  // Implementation
}
```

### Testing

- Write tests for new features
- Maintain >95% coverage
- Use descriptive test names

Example:
```solidity
function test_RevertWhen_SessionExpired() public {
    // Test implementation
}
```

## Areas to Contribute

### 🐛 Bug Fixes

Check [Issues](https://github.com/[your-repo]/issues) for bugs labeled `bug`.

### ✨ Features

See [Project Roadmap](./README.md#roadmap) for planned features.

Priority areas:
- Session auto-renewal
- Multi-language support
- Additional trading pairs
- Cross-chain support

### 📝 Documentation

Help improve:
- Code comments
- User guides
- API documentation
- Translations

### 🧪 Testing

- Write more tests
- Improve test coverage
- Add E2E tests
- Perform manual testing

### 🔍 Security

- Review code for vulnerabilities
- Improve error handling
- Add input validation
- Report bugs via our [Bug Bounty](./SECURITY.md)

## Code Review Process

All submissions require review:

1. **Automated checks** must pass:
   - Tests
   - Linter
   - Type checking
   - Gas snapshots

2. **Code review** by maintainer:
   - Code quality
   - Test coverage
   - Documentation
   - Security implications

3. **Approval** required before merge

## Testing Guidelines

### Smart Contracts

```bash
# Run all tests
forge test

# Run specific test
forge test --match-test test_SessionCheck

# Run with gas report
forge test --gas-report

# Run coverage
forge coverage
```

### Frontend

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Documentation

### Code Documentation

- Add NatSpec for Solidity functions
- Add JSDoc for TypeScript functions
- Update README when adding features
- Keep architecture docs current

### User Documentation

Located in `docs/`:
- `guides/` - Technical guides
- `user-guide/` - End-user documentation
- `api/` - API reference

## Community

- Questions? Open a [Discussion](https://github.com/[your-repo]/discussions)
- Found a bug? Open an [Issue](https://github.com/[your-repo]/issues)
- Want to chat? Join our [Discord](https://discord.gg/[your-server])

## Recognition

Contributors will be:
- Listed in [CONTRIBUTORS.md](./CONTRIBUTORS.md)
- Credited in release notes
- Eligible for contributor NFTs (coming soon)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

## Thank You! 🙏

Every contribution helps make ILAL better for everyone.

Happy coding! 💻✨
