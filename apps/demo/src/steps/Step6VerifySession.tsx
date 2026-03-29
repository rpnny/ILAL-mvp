import StepCard, { type StepState } from '../components/StepCard';

type Props = {
  state: StepState;
  onExecute: () => void;
};

export default function Step6VerifySession({ state, onExecute }: Props) {
  return (
    <StepCard
      stepIndex={5}
      title="Verify Session"
      description="Read the on-chain SessionManager to confirm the session is active and check remaining time."
      buttonLabel="Verify Session"
      onExecute={onExecute}
      state={state}
    />
  );
}
