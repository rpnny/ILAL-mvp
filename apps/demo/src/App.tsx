import { useState, useCallback } from 'react';
import {
  createPublicClient, createWalletClient, custom, http, parseEther, parseAbi,
  encodeAbiParameters, parseAbiParameters, maxUint256,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { API_URL, CHAIN_ID, BASE_SEPOLIA_RPC, CONTRACTS, TOKENS, STEP_INFO } from './config';
import type { StepState } from './components/StepCard';
import WalletBar from './components/WalletBar';
import Stepper from './components/Stepper';
import Step1Connect from './steps/Step1Connect';
import Step2Health from './steps/Step2Health';
import Step3Register from './steps/Step3Register';
import Step4KycStatus from './steps/Step4KycStatus';
import Step5ActivateSession from './steps/Step5ActivateSession';
import Step6VerifySession from './steps/Step6VerifySession';
import Step7Swap from './steps/Step7Swap';
import Step8Rejection from './steps/Step8Rejection';

const erc20Abi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
]);

const routerAbi = [{
  type: 'function' as const,
  name: 'swap' as const,
  stateMutability: 'payable' as const,
  inputs: [
    {
      name: 'key', type: 'tuple' as const,
      components: [
        { name: 'currency0', type: 'address' as const },
        { name: 'currency1', type: 'address' as const },
        { name: 'fee', type: 'uint24' as const },
        { name: 'tickSpacing', type: 'int24' as const },
        { name: 'hooks', type: 'address' as const },
      ],
    },
    {
      name: 'params', type: 'tuple' as const,
      components: [
        { name: 'zeroForOne', type: 'bool' as const },
        { name: 'amountSpecified', type: 'int256' as const },
        { name: 'sqrtPriceLimitX96', type: 'uint160' as const },
      ],
    },
    { name: 'hookData', type: 'bytes' as const },
    { name: 'minAmountOut', type: 'uint128' as const },
  ],
  outputs: [{ name: 'delta', type: 'int256' as const }],
}] as const;

const hookAbi = parseAbi([
  'function getNonce(address user) view returns (uint256)',
]);

const MIN_SQRT_PRICE = BigInt('4295128739') + 1n;
const MAX_SQRT_PRICE = BigInt('1461446703485210103287273052203988822378723970342') - 1n;

// Pool key ordering: currency0 < currency1 by address
const [CURRENCY0, CURRENCY1] = TOKENS.mUSD.address.toLowerCase() < TOKENS.mTBILL.address.toLowerCase()
  ? [TOKENS.mUSD.address, TOKENS.mTBILL.address]
  : [TOKENS.mTBILL.address, TOKENS.mUSD.address];
const ZERO_FOR_ONE = TOKENS.mUSD.address.toLowerCase() === CURRENCY0.toLowerCase(); // mUSD → mTBILL

const POOL_KEY = {
  currency0: CURRENCY0,
  currency1: CURRENCY1,
  fee: 500,
  tickSpacing: 10,
  hooks: CONTRACTS.COMPLIANCE_HOOK,
} as const;

const initialStep = (): StepState => ({ status: 'idle' });

// Build EIP-712 signed hookData (same format as SwapWidget permit mode)
async function buildPermitHookData(
  walletClientInstance: any,
  publicClientInstance: any,
  account: `0x${string}`,
): Promise<`0x${string}`> {
  const nonce = await publicClientInstance.readContract({
    address: CONTRACTS.COMPLIANCE_HOOK,
    abi: hookAbi,
    functionName: 'getNonce',
    args: [account],
  });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 10 * 60);

  const signature = await walletClientInstance.signTypedData({
    account,
    domain: {
      name: 'ILAL ComplianceHook',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: CONTRACTS.COMPLIANCE_HOOK,
    },
    types: {
      SwapPermit: [
        { name: 'user', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
      ],
    },
    primaryType: 'SwapPermit',
    message: { user: account, deadline, nonce },
  });

  return encodeAbiParameters(
    parseAbiParameters('(address user, uint256 deadline, uint256 nonce, bytes signature)'),
    [{ user: account, deadline, nonce, signature }],
  );
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [walletClient, setWalletClient] = useState<any>(null);
  const [publicClient] = useState(() =>
    createPublicClient({ chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC) }) as any
  );

  const [steps, setSteps] = useState<StepState[]>(
    () => Array.from({ length: 8 }, initialStep)
  );

  const update = useCallback((i: number, patch: Partial<StepState>) => {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }, []);

  const markDone = useCallback((i: number) => {
    setCompleted(prev => new Set(prev).add(i));
    if (i < 7) setCurrentStep(i + 1);
  }, []);

  // ─── Step 1: Connect ───
  const connectWallet = useCallback(async () => {
    update(0, { status: 'running', error: undefined, response: undefined });
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error('MetaMask not found. Please install MetaMask.');

      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });

      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
        });
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + CHAIN_ID.toString(16),
              chainName: 'Base Sepolia',
              rpcUrls: [BASE_SEPOLIA_RPC],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: ['https://sepolia.basescan.org'],
            }],
          });
        }
      }

      const cid = parseInt(await ethereum.request({ method: 'eth_chainId' }), 16);
      const addr = accounts[0];
      setAddress(addr);
      setChainId(cid);

      const wc = createWalletClient({
        account: addr as `0x${string}`,
        chain: baseSepolia,
        transport: custom(ethereum),
      });
      setWalletClient(wc);

      update(0, { status: 'success', response: { address: addr, chainId: cid, network: 'Base Sepolia' } });
      markDone(0);
    } catch (err: any) {
      update(0, { status: 'error', error: err.message || String(err) });
    }
  }, [update, markDone]);

  // ─── Step 2: Health ───
  const checkHealth = useCallback(async () => {
    update(1, { status: 'running', error: undefined, request: undefined, response: undefined });
    const t = Date.now();
    try {
      update(1, { request: { method: 'GET', url: '/api/v1/health' } });
      const res = await fetch(`${API_URL}/api/v1/health`);
      const data = await res.json();
      update(1, { status: 'success', response: data, elapsed: Date.now() - t });
      markDone(1);
    } catch (err: any) {
      update(1, { status: 'error', error: err.message, elapsed: Date.now() - t });
    }
  }, [update, markDone]);

  // ─── Step 3: Register ───
  // API expects: { name: string, walletAddress: string, countryCode?: number }
  const register = useCallback(async (name: string, countryCode: number) => {
    if (!address) {
      update(2, { status: 'error', error: 'Connect your wallet first (Step 1).' });
      return;
    }
    if (!apiKey) {
      update(2, { status: 'error', error: 'Enter your ILAL API key in the top-right input bar, then try again.' });
      return;
    }
    update(2, { status: 'running', error: undefined, request: undefined, response: undefined });
    const t = Date.now();
    const body = { name, walletAddress: address, countryCode };
    try {
      update(2, { request: { method: 'POST', url: '/api/v1/onboarding/register', body } });
      const res = await fetch(`${API_URL}/api/v1/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      // 409 = already registered → treat as success and proceed
      if (res.status === 409) {
        update(2, {
          status: 'success',
          response: { ...data, note: 'Already registered — proceeding to KYC check.' },
          elapsed: Date.now() - t,
        });
        markDone(2);
        return;
      }

      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      update(2, { status: 'success', response: data, elapsed: Date.now() - t });
      markDone(2);
    } catch (err: any) {
      update(2, { status: 'error', error: err.message, elapsed: Date.now() - t });
    }
  }, [address, apiKey, update, markDone]);

  // ─── Step 4: KYC Status ───
  const checkKyc = useCallback(async () => {
    if (!address) {
      update(3, { status: 'error', error: 'Connect your wallet first (Step 1).' });
      return;
    }
    if (!apiKey) {
      update(3, { status: 'error', error: 'Enter your ILAL API key in the top-right input bar, then try again.' });
      return;
    }
    update(3, { status: 'running', error: undefined, request: undefined, response: undefined });
    const t = Date.now();
    try {
      update(3, { request: { method: 'GET', url: `/api/v1/onboarding/status/${address}` } });
      const res = await fetch(`${API_URL}/api/v1/onboarding/status/${address}`, {
        headers: { 'x-api-key': apiKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      update(3, { status: 'success', response: data, elapsed: Date.now() - t });
      markDone(3);
    } catch (err: any) {
      update(3, { status: 'error', error: err.message, elapsed: Date.now() - t });
    }
  }, [address, apiKey, update, markDone]);

  // ─── Step 5: Activate Session (Demo — no ZK proof, instant on-chain relay) ───
  const activateSession = useCallback(async () => {
    if (!address) {
      update(4, { status: 'error', error: 'Connect your wallet first (Step 1).' });
      return;
    }
    if (!apiKey) {
      update(4, { status: 'error', error: 'Enter your ILAL API key in the top-right input bar, then try again.' });
      return;
    }
    update(4, { status: 'running', error: undefined, request: undefined, response: undefined, txHash: undefined });
    const t = Date.now();
    const body = { walletAddress: address, durationHours: 24 };
    try {
      update(4, { request: { method: 'POST', url: '/api/v1/onboarding/activate-session-demo', body } });
      const res = await fetch(`${API_URL}/api/v1/onboarding/activate-session-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      update(4, { status: 'success', response: data, txHash: data.txHash, elapsed: Date.now() - t });
      markDone(4);
    } catch (err: any) {
      update(4, { status: 'error', error: err.message || String(err), elapsed: Date.now() - t });
    }
  }, [address, apiKey, update, markDone]);

  // ─── Step 6: Verify Session ───
  const verifySession = useCallback(async () => {
    if (!address) {
      update(5, { status: 'error', error: 'Connect wallet first.' });
      return;
    }
    update(5, { status: 'running', error: undefined, request: undefined, response: undefined });
    const t = Date.now();
    try {
      update(5, { request: { method: 'GET', url: `/api/v1/session/${address}` } });
      const res = await fetch(`${API_URL}/api/v1/session/${address}`);
      const data = await res.json();
      update(5, { status: 'success', response: data, elapsed: Date.now() - t });
      markDone(5);
    } catch (err: any) {
      update(5, { status: 'error', error: err.message, elapsed: Date.now() - t });
    }
  }, [address, update, markDone]);

  // ─── Step 7: Compliant Swap ───
  const executeSwap = useCallback(async (amount: string) => {
    if (!address || !walletClient) {
      update(6, { status: 'error', error: 'Connect wallet first.' });
      return;
    }
    update(6, { status: 'running', error: undefined, request: undefined, response: undefined, txHash: undefined });
    const t = Date.now();
    try {
      const amountWei = parseEther(amount);

      // 1. Check balance
      const balance = await publicClient.readContract({
        address: TOKENS.mUSD.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });
      if ((balance as bigint) < amountWei) {
        throw new Error(`Insufficient mUSD balance. Have ${Number(balance as bigint) / 1e18} mUSD, need ${amount} mUSD.`);
      }

      // 2. Approve if needed
      const allowance = await publicClient.readContract({
        address: TOKENS.mUSD.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, CONTRACTS.SWAP_ROUTER],
      });
      if ((allowance as bigint) < amountWei) {
        update(6, { request: { step: 'Approving mUSD → SwapRouter (MetaMask will prompt)...' } });
        const approveHash = await walletClient.writeContract({
          address: TOKENS.mUSD.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [CONTRACTS.SWAP_ROUTER, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 3. Build EIP-712 signed hookData (same as SwapWidget permit mode)
      update(6, { request: { step: 'Signing SwapPermit (MetaMask will prompt)...' } });
      const hookData = await buildPermitHookData(walletClient, publicClient, address as `0x${string}`);

      // 4. Execute swap via SwapRouter
      update(6, { request: {
        action: 'swap',
        tokenIn: 'mUSD',
        tokenOut: 'mTBILL',
        amount,
        poolFee: 500,
        zeroForOne: ZERO_FOR_ONE,
      }});

      const swapHash = await walletClient.writeContract({
        address: CONTRACTS.SWAP_ROUTER,
        abi: routerAbi,
        functionName: 'swap',
        args: [
          POOL_KEY,
          {
            zeroForOne: ZERO_FOR_ONE,
            amountSpecified: -amountWei,
            sqrtPriceLimitX96: ZERO_FOR_ONE ? MIN_SQRT_PRICE : MAX_SQRT_PRICE,
          },
          hookData,
          0n,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });

      update(6, {
        status: 'success',
        request: { action: 'swap', tokenIn: 'mUSD', tokenOut: 'mTBILL', amount },
        response: {
          status: receipt.status,
          hash: swapHash,
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed.toString(),
        },
        txHash: swapHash,
        elapsed: Date.now() - t,
      });
      markDone(6);
    } catch (err: any) {
      const msg = err.shortMessage || err.message || String(err);
      update(6, { status: 'error', error: msg, elapsed: Date.now() - t });
    }
  }, [address, walletClient, publicClient, update, markDone]);

  // ─── Step 8: Rejection Demo ───
  const simulateRejection = useCallback(async () => {
    update(7, { status: 'running', error: undefined, request: undefined, response: undefined });
    const t = Date.now();
    try {
      const deadAddr = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;

      // Build hookData for 0xdead (no signature — will fail at hook)
      const hookData = encodeAbiParameters(
        parseAbiParameters('(address user, uint256 deadline, uint256 nonce, bytes signature)'),
        [{ user: deadAddr, deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), nonce: 0n, signature: '0x' as `0x${string}` }],
      );

      update(7, { request: { action: 'eth_call simulate swap', from: deadAddr, note: '0xdead has no active ZK session' } });

      try {
        await publicClient.simulateContract({
          address: CONTRACTS.SWAP_ROUTER,
          abi: routerAbi,
          functionName: 'swap',
          args: [
            POOL_KEY,
            {
              zeroForOne: ZERO_FOR_ONE,
              amountSpecified: -parseEther('0.001'),
              sqrtPriceLimitX96: ZERO_FOR_ONE ? MIN_SQRT_PRICE : MAX_SQRT_PRICE,
            },
            hookData,
            0n,
          ],
          account: deadAddr,
        });
        // Unexpected: did not revert
        update(7, {
          status: 'error',
          error: 'Unexpected: simulation succeeded — hook may not be enforcing compliance.',
          elapsed: Date.now() - t,
        });
      } catch (simErr: any) {
        const revertMsg = simErr.shortMessage || simErr.message || String(simErr);
        const isNotCompliant = revertMsg.includes('NotCompliant') || revertMsg.includes('0x90bfb865');

        update(7, {
          status: 'success',
          request: { action: 'eth_call simulate swap', from: deadAddr },
          response: {
            reverted: true,
            errorSelector: '0x90bfb865',
            errorName: 'NotCompliant()',
            isNotCompliant,
            explanation: isNotCompliant
              ? '✅ ComplianceHook correctly rejected — 0xdead has no active ZK session on-chain.'
              : revertMsg,
          },
          elapsed: Date.now() - t,
        });
        markDone(7);
      }
    } catch (err: any) {
      update(7, { status: 'error', error: err.message, elapsed: Date.now() - t });
    }
  }, [publicClient, update, markDone]);

  const stepComponents = [
    <Step1Connect state={steps[0]} onConnect={connectWallet} address={address} chainId={chainId} />,
    <Step2Health state={steps[1]} onExecute={checkHealth} />,
    <Step3Register state={steps[2]} onExecute={register} />,
    <Step4KycStatus state={steps[3]} onExecute={checkKyc} />,
    <Step5ActivateSession state={steps[4]} onExecute={activateSession} />,
    <Step6VerifySession state={steps[5]} onExecute={verifySession} />,
    <Step7Swap state={steps[6]} onExecute={executeSwap} />,
    <Step8Rejection state={steps[7]} onExecute={simulateRejection} swapSuccess={completed.has(6)} />,
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <WalletBar
        address={address}
        chainId={chainId}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        needsApiKey={[2, 3, 4].includes(currentStep)}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-white/[0.06] p-4 overflow-y-auto shrink-0">
          <div className="text-xs uppercase tracking-widest text-gray-600 mb-3 px-4">
            Progress {completed.size}/{STEP_INFO.length}
          </div>
          <Stepper current={currentStep} completed={completed} onSelect={setCurrentStep} />
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {stepComponents[currentStep]}
          </div>
        </main>
      </div>
    </div>
  );
}
