import StepCard, { type StepState } from '../components/StepCard';
import { CHAIN_ID } from '../config';

type Props = {
  state: StepState;
  onConnect: () => void;
  address: string | null;
  chainId: number | null;
};

export default function Step1Connect({ state, onConnect, address, chainId }: Props) {
  return (
    <StepCard
      stepIndex={0}
      title="Connect Wallet"
      description="Connect MetaMask and switch to Base Sepolia (chainId 84532)."
      buttonLabel={address ? 'Reconnect' : 'Connect MetaMask'}
      onExecute={onConnect}
      state={state}
    >
      {address && (
        <div className="ml-11 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Address:</span>
            <code className="text-gray-300">{address}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Chain:</span>
            <span className={chainId === CHAIN_ID ? 'text-green-400' : 'text-yellow-400'}>
              {chainId === CHAIN_ID ? 'Base Sepolia ✓' : `Wrong chain (${chainId})`}
            </span>
          </div>
        </div>
      )}
    </StepCard>
  );
}
