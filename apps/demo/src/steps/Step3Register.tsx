import { useState } from 'react';
import StepCard, { type StepState } from '../components/StepCard';

// API expects { name, walletAddress, countryCode: number (ISO 3166-1 numeric) }
const COUNTRY_OPTIONS = [
  { label: 'United States', code: 840 },
  { label: 'United Kingdom', code: 826 },
  { label: 'Singapore',      code: 702 },
  { label: 'Switzerland',    code: 756 },
  { label: 'Hong Kong',      code: 344 },
  { label: 'Japan',          code: 392 },
  { label: 'Germany',        code: 276 },
  { label: 'Cayman Islands', code: 136 },
  { label: 'BVI',            code: 92  },
];

type Props = {
  state: StepState;
  onExecute: (name: string, countryCode: number) => void;
};

export default function Step3Register({ state, onExecute }: Props) {
  const [name, setName] = useState('Acme Capital');
  const [countryCode, setCountryCode] = useState(840);

  return (
    <StepCard
      stepIndex={2}
      title="Register Institution"
      description="Submit KYC registration. The issuer auto-approves in MVP mode. Make sure your ILAL API key is entered in the top-right input before proceeding."
      buttonLabel="Register"
      onExecute={() => onExecute(name, countryCode)}
      state={state}
    >
      <div className="ml-11 flex gap-3 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Institution name"
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm w-52 focus:outline-none focus:border-cyan/40"
        />
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(Number(e.target.value))}
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-cyan/40"
        >
          {COUNTRY_OPTIONS.map(opt => (
            <option key={opt.code} value={opt.code} className="bg-[#0a0a0f]">
              {opt.label} ({opt.code})
            </option>
          ))}
        </select>
      </div>
      {state.status === 'success' && (
        <p className="ml-11 text-xs text-green-400 mt-1">
          Already registered wallets are handled automatically — no need to re-register.
        </p>
      )}
    </StepCard>
  );
}
