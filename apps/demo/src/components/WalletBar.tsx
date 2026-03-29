type Props = {
  address: string | null;
  chainId: number | null;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  /** highlight the API key input when a step requires it */
  needsApiKey?: boolean;
};

export default function WalletBar({ address, chainId, apiKey, onApiKeyChange, needsApiKey }: Props) {
  const keyMissing = needsApiKey && !apiKey;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-white/[0.01]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-cyan/20 rounded-lg flex items-center justify-center text-cyan font-bold text-sm select-none">
          IL
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">ILAL Demo</h1>
          <p className="text-xs text-gray-600">Institutional Liquidity Access Layer</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* API Key input — highlighted with animation when missing */}
        <div className="relative">
          {keyMissing && (
            <span className="absolute -top-5 left-0 text-[10px] text-yellow-400 whitespace-nowrap animate-pulse">
              ↑ Enter your API key to continue
            </span>
          )}
          <input
            type="text"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="API Key  (ilal_live_...)"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono w-64 focus:outline-none transition-all ${
              keyMissing
                ? 'bg-yellow-500/10 border border-yellow-500/60 placeholder:text-yellow-700 animate-pulse'
                : apiKey
                ? 'bg-green-500/5 border border-green-500/30 placeholder:text-gray-700'
                : 'bg-white/[0.04] border border-white/[0.08] placeholder:text-gray-700 focus:border-cyan/40'
            }`}
          />
        </div>

        {/* Wallet status */}
        {address ? (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${chainId === 84532 ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <code className="text-xs text-gray-400">
              {address.slice(0, 6)}...{address.slice(-4)}
            </code>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              chainId === 84532
                ? 'text-green-500 bg-green-500/10'
                : 'text-yellow-500 bg-yellow-500/10'
            }`}>
              {chainId === 84532 ? 'Base Sepolia ✓' : `Wrong chain (${chainId})`}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-600 italic">Wallet not connected</span>
        )}
      </div>
    </header>
  );
}
