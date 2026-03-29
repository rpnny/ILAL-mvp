import { useEffect, useState } from 'react';
import StepCard, { type StepState } from '../components/StepCard';

type Props = {
  state: StepState;
  onExecute: () => void;
};

export default function Step5ActivateSession({ state, onExecute }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state.status !== 'running') {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  return (
    <StepCard
      stepIndex={4}
      title="Activate ZK Session"
      description="The API generates a ZK-SNARK proof (PLONK, 19,763 constraints) server-side and relays an on-chain transaction to activate a 24h compliance session."
      buttonLabel="Activate Session"
      onExecute={onExecute}
      state={state}
    >
      {state.status === 'running' && (
        <div className="ml-11 space-y-2">
          <div className="flex items-center gap-2 text-sm text-cyan">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span>Generating ZK-SNARK proof... {elapsed}s</span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden w-64">
            <div
              className="h-full bg-cyan/60 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((elapsed / 25) * 100, 95)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">
            PLONK proof generation typically takes 15–30s. Waiting for on-chain confirmation after proof...
          </p>
        </div>
      )}
    </StepCard>
  );
}
