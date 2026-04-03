export const API_URL = '';
export const CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
export const BASESCAN_TX = 'https://sepolia.basescan.org/tx/';

export const CONTRACTS = {
  SWAP_ROUTER: '0xd46D84Dc2D098c767451675C9BcB85bf3f8a2891' as `0x${string}`,
  COMPLIANCE_HOOK: '0xdD37A28e15A9592eAAd3f7Df0Ad36e374Af68A80' as `0x${string}`,
  POOL_MANAGER: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408' as `0x${string}`,
  SESSION_MANAGER: '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2' as `0x${string}`,
  REGISTRY: '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD' as `0x${string}`,
} as const;

export const TOKENS = {
  mUSD: {
    address: '0xdd3d112a48906807c4b73c94ed884552427e4cf9' as `0x${string}`,
    symbol: 'mUSD',
    decimals: 18,
  },
  mTBILL: {
    address: '0xfb080423cedd4ca56da3f60a4b901f51846459ae' as `0x${string}`,
    symbol: 'mTBILL',
    decimals: 18,
  },
} as const;

export const STEP_INFO = [
  { title: 'Connect Wallet',          subtitle: 'MetaMask on Base Sepolia' },
  { title: 'API Health Check',        subtitle: 'GET /api/v1/health' },
  { title: 'Register Institution',    subtitle: 'POST /onboarding/register' },
  { title: 'Check KYC Status',        subtitle: 'GET /onboarding/status/:addr' },
  { title: 'Activate Session (Demo)',  subtitle: 'POST /onboarding/activate-session-demo' },
  { title: 'Verify Session',          subtitle: 'GET /session/:addr' },
  { title: 'Compliant Swap',          subtitle: 'mUSD → mTBILL via SwapRouter' },
  { title: 'Rejection Demo',          subtitle: '0xdead → NotCompliant revert' },
] as const;
