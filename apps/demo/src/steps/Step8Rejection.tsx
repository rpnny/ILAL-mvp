import StepCard, { type StepState } from '../components/StepCard';

type Props = {
  state: StepState;
  onExecute: () => void;
  swapSuccess?: boolean;
};

export default function Step8Rejection({ state, onExecute, swapSuccess }: Props) {
  return (
    <StepCard
      stepIndex={7}
      title="Rejection Demo"
      description="Simulate a swap from 0x000...dEaD (an unregistered address with no ZK session). The ComplianceHook's beforeSwap() will atomically revert with NotCompliant(). No gas spent, no state change."
      buttonLabel="Simulate Rejection"
      onExecute={onExecute}
      state={state}
    >
      <div className="ml-11 space-y-3">
        {swapSuccess && (
          <div className="flex gap-4 text-xs">
            <div className="flex-1 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-green-400 font-semibold mb-1">✅ Your wallet (Step 7)</div>
              <div className="text-gray-400">Active ZK session → Swap succeeded</div>
            </div>
            <div className="flex-1 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-red-400 font-semibold mb-1">❌ 0xdead (Step 8)</div>
              <div className="text-gray-400">No session → NotCompliant() revert</div>
            </div>
          </div>
        )}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-gray-500">
          <div>from: <span className="text-red-400">0x000000000000000000000000000000000000dEaD</span></div>
          <div>call: SwapRouter.swap(...)</div>
          <div>result: <span className="text-red-400">revert NotCompliant() [0x90bfb865]</span></div>
        </div>
      </div>
    </StepCard>
  );
}
