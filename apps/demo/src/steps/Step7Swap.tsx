import { useState } from 'react';
import StepCard, { type StepState } from '../components/StepCard';

type Props = {
  state: StepState;
  onExecute: (amount: string) => void;
};

export default function Step7Swap({ state, onExecute }: Props) {
  const [amount, setAmount] = useState('0.01');

  return (
    <StepCard
      stepIndex={6}
      title="Compliant Swap"
      description="Execute a real on-chain swap (mUSD → mTBILL) through the ComplianceHook-protected Uniswap v4 pool. MetaMask will prompt twice: once for token approval, once for the EIP-712 SwapPermit signature."
      buttonLabel="Execute Swap"
      onExecute={() => onExecute(amount)}
      state={state}
    >
      <div className="ml-11 space-y-3">
        <div className="flex items-center gap-3">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm w-28 focus:outline-none focus:border-cyan/40 font-mono"
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-cyan/10 text-cyan rounded font-mono">mUSD</span>
            <span className="text-gray-500">→</span>
            <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded font-mono">mTBILL</span>
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Need testnet mUSD? The relayer wallet holds tokens — ask via the demo script or use the API to mint.
        </p>
      </div>
    </StepCard>
  );
}
