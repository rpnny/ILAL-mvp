import StepCard, { type StepState } from '../components/StepCard';

type Props = {
  state: StepState;
  onExecute: () => void;
};

export default function Step5ActivateSession({ state, onExecute }: Props) {
  return (
    <StepCard
      stepIndex={4}
      title="Activate Session (Demo)"
      description="Skips ZK-SNARK proof generation and directly relays SessionManager.startSession() on-chain. The relayer wallet pays gas. Session is valid for 24 hours."
      buttonLabel="Activate Session"
      onExecute={onExecute}
      state={state}
    >
      {state.status === 'running' && (
        <div className="ml-11 flex items-center gap-2 text-sm text-cyan">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>Relaying on-chain session activation...</span>
        </div>
      )}
      {state.status === 'success' && (state.response as any)?.alreadyActive && (
        <p className="ml-11 text-xs text-green-400 mt-1">
          Session was already active — no new transaction needed.
        </p>
      )}
    </StepCard>
  );
}
