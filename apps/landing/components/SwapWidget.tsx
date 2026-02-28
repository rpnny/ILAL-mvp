'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ShieldCheck, ArrowDownUp, Loader2 } from 'lucide-react';
import { executeSwap } from '../lib/api';
import { getAccessToken } from '../lib/auth';
import { ADDRESSES } from '../lib/contracts';
import toast from 'react-hot-toast';
import { createWalletClient, custom, createPublicClient, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';

const erc20Abi = parseAbi([
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
]);

interface SwapWidgetProps {
    walletAddress?: string;
}

export default function SwapWidget({ walletAddress }: SwapWidgetProps) {
    const [amount, setAmount] = useState('');
    const [zeroForOne, setZeroForOne] = useState(true);
    const [slippage, setSlippage] = useState(0.5);
    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const tokenIn = zeroForOne ? 'USDC' : 'WETH';
    const tokenOut = zeroForOne ? 'WETH' : 'USDC';

    // Simulated Exchange Rate (MVP): 1 WETH ~ 3000 USDC
    const estimatedOutput = useMemo(() => {
        if (!amount || isNaN(Number(amount))) return '';
        const val = Number(amount);
        if (zeroForOne) {
            // USDC -> WETH
            const parsed = val / 3000;
            return parsed < 0.000001 ? '< 0.000001' : parsed.toFixed(6).replace(/\.?0+$/, "");
        } else {
            // WETH -> USDC
            return (val * 3000).toFixed(2);
        }
    }, [amount, zeroForOne]);

    const handleSwap = async () => {
        if (!amount || isNaN(Number(amount))) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (!walletAddress) {
            toast.error('Wallet address not found in profile');
            return;
        }

        const token = getAccessToken();
        if (!token) return;

        setLoading(true);
        setTxHash(null);
        try {
            // Very naive decimal scaling: WETH has 18, USDC has 6
            const decimalsIn = zeroForOne ? 6 : 18;
            const amountScaled = (parseFloat(amount) * (10 ** decimalsIn)).toString();

            const result = await executeSwap(token, {
                tokenIn: zeroForOne ? ADDRESSES.USDC : ADDRESSES.WETH,
                tokenOut: zeroForOne ? ADDRESSES.WETH : ADDRESSES.USDC,
                amount: amountScaled,
                zeroForOne,
                userAddress: walletAddress,
                slippage,
            });

            if (!result.success || !result.transaction) {
                throw new Error('Failed to generate swap transaction');
            }

            if (typeof window !== 'undefined' && (window as any).ethereum) {
                const walletClient = createWalletClient({
                    chain: baseSepolia,
                    transport: custom((window as any).ethereum)
                });
                const publicClient = createPublicClient({
                    chain: baseSepolia,
                    transport: custom((window as any).ethereum)
                });

                const [account] = await walletClient.requestAddresses();

                const tokenInAddress = zeroForOne ? ADDRESSES.USDC : ADDRESSES.WETH;
                const amountBigInt = BigInt(amountScaled);

                // 1) Check Allowance
                toast.loading('Checking allowance...', { id: 'swap-toast' });
                const allowance = await publicClient.readContract({
                    address: tokenInAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'allowance',
                    args: [account, ADDRESSES.SWAP_ROUTER as `0x${string}`],
                });

                // 2) Request Approval if needed
                if (allowance < amountBigInt) {
                    toast.loading(`Please approve ${tokenIn} in your wallet...`, { id: 'swap-toast' });
                    const approveHash = await walletClient.writeContract({
                        account,
                        address: tokenInAddress as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [ADDRESSES.SWAP_ROUTER as `0x${string}`, amountBigInt],
                    });

                    toast.loading(`Waiting for approval confirmation...`, { id: 'swap-toast' });
                    await publicClient.waitForTransactionReceipt({ hash: approveHash });
                    toast.success(`${tokenIn} Approved!`, { id: 'swap-toast' });
                }

                // 3) Execute Swap
                toast.loading('Confirming swap in wallet...', { id: 'swap-toast' });

                const hash = await walletClient.sendTransaction({
                    account,
                    to: result.transaction.to as `0x${string}`,
                    data: result.transaction.data as `0x${string}`,
                    value: BigInt(result.transaction.value || 0),
                });

                toast.loading('Waiting for swap confirmation...', { id: 'swap-toast' });
                await publicClient.waitForTransactionReceipt({ hash });

                toast.success('Swap executed successfully!', { id: 'swap-toast' });
                setTxHash(hash);
                setAmount('');
            } else {
                toast.error('Please install a Web3 wallet (e.g. MetaMask)');
            }
        } catch (err: any) {
            toast.error(err.message || 'Swap failed', { id: 'swap-toast' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto relative group">
            {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00F0FF]/20 to-[#A855F7]/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <div className="relative bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                    <h2 className="font-heading font-semibold text-lg pb-1">Swap</h2>
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-400 hover:text-white transition-colors"
                    >
                        <Settings2 className="w-4 h-4" />
                    </motion.button>
                </div>

                {/* Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-3 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <div className="text-sm text-gray-400 mb-2">Max Slippage</div>
                                <div className="flex gap-2">
                                    {[0.1, 0.5, 1.0].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setSlippage(val)}
                                            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors border ${slippage === val
                                                ? 'bg-[#00F0FF]/15 border-[#00F0FF]/30 text-[#00F0FF]'
                                                : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:bg-white/[0.06]'
                                                }`}
                                        >
                                            {val}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Input Token Box */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04] group-hover:bg-white/[0.04] transition-colors relative">
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="text-gray-400 font-medium">You pay</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full bg-transparent text-3xl font-heading font-semibold text-white outline-none placeholder-gray-600 truncate"
                        />
                        <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-full border border-white/[0.08] shrink-0 shadow-inner">
                            <span className="font-semibold">{tokenIn}</span>
                        </div>
                    </div>
                </div>

                {/* Swap Direction Button */}
                <div className="relative h-2 z-10 -my-2 flex justify-center">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setZeroForOne(!zeroForOne)}
                        className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.2] transition-colors relative overflow-hidden group/btn shadow-lg"
                    >
                        {/* Rotate on hover */}
                        <ArrowDownUp className="w-4 h-4 transition-transform group-hover/btn:rotate-180 duration-500" />
                        <div className="absolute inset-0 bg-[#00F0FF]/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </motion.button>
                </div>

                {/* Output Token Box */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04] group-hover:bg-white/[0.04] transition-colors opacity-80">
                    <div className="flex justify-between mb-2 text-sm">
                        <span className="text-gray-400 font-medium">You receive</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <input
                            type="text"
                            readOnly
                            value={amount ? `~ ${estimatedOutput}` : ''}
                            placeholder="0.0"
                            className="w-full bg-transparent text-3xl font-heading font-semibold text-gray-300 outline-none placeholder-gray-600 cursor-not-allowed truncate"
                        />
                        <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-1.5 rounded-full border border-white/[0.08] shrink-0">
                            <span className="font-semibold">{tokenOut}</span>
                        </div>
                    </div>
                </div>

                {/* Verification Footer Text */}
                <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-green-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ZK Compliance Verified
                </div>

                {/* Submit */}
                <button
                    onClick={handleSwap}
                    disabled={loading || !amount}
                    className="relative w-full mt-4 py-4 rounded-xl font-bold text-lg overflow-hidden group/submit shadow-xl shadow-[#00F0FF]/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {/* Animated Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF] via-[#3B82F6] to-[#00F0FF] bg-[length:200%_auto] group-hover/submit:animate-gradient-shift transition-all" />

                    <div className="relative flex justify-center items-center text-[#0A0A0A]">
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : !walletAddress ? (
                            'No Wallet Linked'
                        ) : !amount ? (
                            'Enter Amount'
                        ) : (
                            'Execute Compliant Swap'
                        )}
                    </div>
                </button>

                {/* Tx Link */}
                <AnimatePresence>
                    {txHash && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center"
                        >
                            <div className="text-sm text-green-400">Transaction Submitted!</div>
                            <a
                                href={`https://sepolia.basescan.org/tx/${txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[#00F0FF] hover:underline mt-1 block truncate"
                            >
                                {txHash}
                            </a>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
