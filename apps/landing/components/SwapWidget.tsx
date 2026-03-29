'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ShieldCheck, ShieldOff, ArrowDownUp, Loader2, Clock } from 'lucide-react';
import { executeSwap, getSessionStatus } from '../lib/api';
import { getAccessToken } from '../lib/auth';
import { ADDRESSES } from '../lib/contracts';
import toast from 'react-hot-toast';
import {
    createWalletClient,
    custom,
    createPublicClient,
    parseAbi,
    encodeAbiParameters,
    parseAbiParameters,
} from 'viem';
import { baseSepolia } from 'viem/chains';

const erc20Abi = parseAbi([
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
]);

const hookAbi = parseAbi([
    'function getNonce(address user) view returns (uint256)',
]);

const routerAbi = [
    {
        type: 'function' as const,
        name: 'swap' as const,
        stateMutability: 'payable' as const,
        inputs: [
            {
                name: 'key',
                type: 'tuple' as const,
                components: [
                    { name: 'currency0', type: 'address' as const },
                    { name: 'currency1', type: 'address' as const },
                    { name: 'fee', type: 'uint24' as const },
                    { name: 'tickSpacing', type: 'int24' as const },
                    { name: 'hooks', type: 'address' as const },
                ],
            },
            {
                name: 'params',
                type: 'tuple' as const,
                components: [
                    { name: 'zeroForOne', type: 'bool' as const },
                    { name: 'amountSpecified', type: 'int256' as const },
                    { name: 'sqrtPriceLimitX96', type: 'uint160' as const },
                ],
            },
            { name: 'hookData', type: 'bytes' as const },
            { name: 'minAmountOut', type: 'uint128' as const },
        ],
        outputs: [{ name: 'delta', type: 'int256' as const }],
    },
] as const;

const MIN_SQRT_PRICE = BigInt("4295128739") + BigInt(1);
const MAX_SQRT_PRICE = BigInt("1461446703485210103287273052203988822378723970342") - BigInt(1);

type TokenConfig = {
    symbol: string;
    address: `0x${string}`;
    decimals: number;
};

interface SwapWidgetProps {
    walletAddress?: string;
    tokenA?: TokenConfig;
    tokenB?: TokenConfig;
    mode?: 'api' | 'permit';
}

const DEFAULT_TOKEN_A: TokenConfig = {
    symbol: 'mUSD',
    address: ADDRESSES.mUSD,
    decimals: 18,
};

const DEFAULT_TOKEN_B: TokenConfig = {
    symbol: 'mTBILL',
    address: ADDRESSES.mTBILL,
    decimals: 18,
};

export default function SwapWidget({
    walletAddress,
    tokenA = DEFAULT_TOKEN_A,
    tokenB = DEFAULT_TOKEN_B,
    mode = 'api',
}: SwapWidgetProps) {
    const [amount, setAmount] = useState('');
    const [zeroForOne, setZeroForOne] = useState(true);
    const [slippage, setSlippage] = useState(0.5);
    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [sessionActive, setSessionActive] = useState<boolean | null>(null);
    const [sessionRemaining, setSessionRemaining] = useState<number>(0);
    const [sessionLoading, setSessionLoading] = useState(false);

    const checkSession = useCallback(async (address?: string) => {
        const addr = address || walletAddress;
        if (!addr) { setSessionActive(null); return; }
        const token = getAccessToken();
        if (!token) {
            setSessionActive(null);
            setSessionRemaining(0);
            return;
        }
        setSessionLoading(true);
        try {
            const data = await getSessionStatus(token, addr);
            setSessionActive(!!data.active);
            setSessionRemaining(data.remainingSeconds || 0);
        } catch {
            setSessionActive(null);
        } finally {
            setSessionLoading(false);
        }
    }, [walletAddress]);

    useEffect(() => { checkSession(); }, [checkSession]);

    const tokenIn = zeroForOne ? tokenA.symbol : tokenB.symbol;
    const tokenOut = zeroForOne ? tokenB.symbol : tokenA.symbol;
    const tokenInConfig = zeroForOne ? tokenA : tokenB;
    const tokenOutConfig = zeroForOne ? tokenB : tokenA;

    const estimatedOutput = useMemo(() => {
        if (!amount || isNaN(Number(amount))) return '';
        const val = Number(amount);
        if (tokenInConfig.decimals <= tokenOutConfig.decimals) {
            const parsed = val / 3000;
            return parsed < 0.000001 ? '< 0.000001' : parsed.toFixed(6).replace(/\.?0+$/, '');
        }
        return (val * 3000).toFixed(2);
    }, [amount, tokenInConfig.decimals, tokenOutConfig.decimals]);

    const getInjectedClients = () => {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error('Please install a Web3 wallet (e.g. MetaMask)');
        }

        const transport = custom((window as any).ethereum);
        return {
            walletClient: createWalletClient({ chain: baseSepolia, transport }),
            publicClient: createPublicClient({ chain: baseSepolia, transport }),
        };
    };

    const buildPermitHookData = async (
        walletClient: ReturnType<typeof createWalletClient>,
        publicClient: ReturnType<typeof createPublicClient>,
        account: `0x${string}`
    ) => {
        const nonce = await publicClient.readContract({
            address: ADDRESSES.COMPLIANCE_HOOK,
            abi: hookAbi,
            functionName: 'getNonce',
            args: [account],
        });

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 10 * 60);
        const signature = await walletClient.signTypedData({
            account,
            domain: {
                name: 'ILAL ComplianceHook',
                version: '1',
                chainId: baseSepolia.id,
                verifyingContract: ADDRESSES.COMPLIANCE_HOOK,
            },
            types: {
                SwapPermit: [
                    { name: 'user', type: 'address' },
                    { name: 'deadline', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                ],
            },
            primaryType: 'SwapPermit',
            message: {
                user: account,
                deadline,
                nonce,
            },
        });

        return encodeAbiParameters(
            parseAbiParameters('(address user, uint256 deadline, uint256 nonce, bytes signature)'),
            [{ user: account, deadline, nonce, signature }]
        );
    };

    const handleSwap = async () => {
        if (!amount || isNaN(Number(amount))) {
            toast.error('Please enter a valid amount');
            return;
        }

        const token = getAccessToken();
        if (!token && mode === 'api') return;

        setLoading(true);
        setTxHash(null);

        try {
            const { walletClient, publicClient } = getInjectedClients();
            const [account] = await walletClient.requestAddresses();

            const amountScaled = (
                parseFloat(amount) * (10 ** tokenInConfig.decimals)
            ).toString();
            const amountBigInt = BigInt(amountScaled);

            toast.loading('Checking allowance...', { id: 'swap-toast' });
            const allowance = await publicClient.readContract({
                address: tokenInConfig.address,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [account, ADDRESSES.SWAP_ROUTER],
            });

            if (allowance < amountBigInt) {
                toast.loading(`Please approve ${tokenIn} in your wallet...`, { id: 'swap-toast' });
                const approveHash = await walletClient.writeContract({
                    account,
                    address: tokenInConfig.address,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [ADDRESSES.SWAP_ROUTER, amountBigInt],
                });
                toast.loading('Waiting for approval confirmation...', { id: 'swap-toast' });
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
                toast.success(`${tokenIn} approved!`, { id: 'swap-toast' });
            }

            let hash: `0x${string}`;

            if (mode === 'permit') {
                const token0 = tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? tokenA : tokenB;
                const token1 = token0.address.toLowerCase() === tokenA.address.toLowerCase() ? tokenB : tokenA;
                const zeroForOneActual = tokenInConfig.address.toLowerCase() === token0.address.toLowerCase();
                const minAmountOut = slippage > 0
                    ? (amountBigInt * BigInt(10_000 - Math.round(slippage * 100))) / BigInt(10_000)
                    : BigInt(0);
                const hookData = await buildPermitHookData(walletClient, publicClient as any, account);

                toast.loading('Signing permit and confirming swap...', { id: 'swap-toast' });
                hash = await walletClient.writeContract({
                    account,
                    address: ADDRESSES.SWAP_ROUTER,
                    abi: routerAbi,
                    functionName: 'swap',
                    args: [
                        {
                            currency0: token0.address,
                            currency1: token1.address,
                            fee: 500,
                            tickSpacing: 10,
                            hooks: ADDRESSES.COMPLIANCE_HOOK,
                        },
                        {
                            zeroForOne: zeroForOneActual,
                            amountSpecified: -amountBigInt,
                            sqrtPriceLimitX96: zeroForOneActual ? MIN_SQRT_PRICE : MAX_SQRT_PRICE,
                        },
                        hookData,
                        minAmountOut,
                    ],
                });
            } else {
                const result = await executeSwap(token!, {
                    tokenIn: tokenInConfig.address,
                    tokenOut: tokenOutConfig.address,
                    amount: amountScaled,
                    zeroForOne,
                    userAddress: walletAddress || account,
                    slippage,
                });

                if (!result.success || !result.transaction) {
                    throw new Error('Failed to generate swap transaction');
                }

                toast.loading('Confirming swap in wallet...', { id: 'swap-toast' });
                hash = await walletClient.sendTransaction({
                    account,
                    to: result.transaction.to as `0x${string}`,
                    data: result.transaction.data as `0x${string}`,
                    value: BigInt(result.transaction.value || 0),
                });
            }

            toast.loading('Waiting for swap confirmation...', { id: 'swap-toast' });
            await publicClient.waitForTransactionReceipt({ hash });

            toast.success('Swap executed successfully!', { id: 'swap-toast' });
            setTxHash(hash);
            setAmount('');
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

                {/* Compliance Session Status */}
                <div className={`flex items-center justify-center gap-1.5 mt-4 text-xs ${
                    sessionLoading ? 'text-gray-500' :
                    sessionActive ? 'text-green-400' :
                    sessionActive === false ? 'text-red-400' : 'text-gray-500'
                }`}>
                    {sessionLoading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking session...</>
                    ) : sessionActive ? (
                        <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Session Active
                            {sessionRemaining > 0 && (
                                <span className="text-gray-500 ml-1">
                                    ({Math.floor(sessionRemaining / 3600)}h {Math.floor((sessionRemaining % 3600) / 60)}m remaining)
                                </span>
                            )}
                        </>
                    ) : sessionActive === false ? (
                        <><ShieldOff className="w-3.5 h-3.5" /> No Active Session — Swap will be rejected</>
                    ) : (
                        <><Clock className="w-3.5 h-3.5" /> Connect wallet to check session</>
                    )}
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
                        ) : !amount ? (
                            'Enter Amount'
                        ) : mode === 'permit' ? (
                            'Sign Permit & Swap'
                        ) : walletAddress ? (
                            'Execute Compliant Swap'
                        ) : (
                            'Connect Wallet & Swap'
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
