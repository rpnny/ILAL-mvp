import StepCard, { type StepState } from '../components/StepCard';

type Props = {
  state: StepState;
  onExecute: () => void;
};

export default function Step4KycStatus({ state, onExecute }: Props) {
  return (
    <StepCard
      stepIndex={3}
      title="Check KYC Status"
      description="Query the institution's on-chain registration and KYC approval status."
      buttonLabel="Check Status"
      onExecute={onExecute}
      state={state}
    />
  );
}
