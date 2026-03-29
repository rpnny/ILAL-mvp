import StepCard, { type StepState } from '../components/StepCard';

type Props = {
  state: StepState;
  onExecute: () => void;
};

export default function Step2Health({ state, onExecute }: Props) {
  return (
    <StepCard
      stepIndex={1}
      title="API Health Check"
      description="Verify the ILAL Railway API is running, database is connected, and the latest block is recent."
      buttonLabel="Check Health"
      onExecute={onExecute}
      state={state}
    />
  );
}
