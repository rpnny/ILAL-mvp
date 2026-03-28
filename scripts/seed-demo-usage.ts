/**
 * Seed Demo Usage Data
 *
 * Makes real API calls to the Railway API to generate UsageRecord entries
 * so the Dashboard Usage page shows meaningful data instead of zeros.
 *
 * Usage:
 *   ILAL_API_KEY=ilal_... npx tsx scripts/seed-demo-usage.ts
 *
 * Options:
 *   ILAL_API_URL  — API base (default: https://ilal-mvp-production.up.railway.app)
 *   CALLS         — Number of calls per endpoint (default: 15)
 */

const API = process.env.ILAL_API_URL || 'https://ilal-mvp-production.up.railway.app';
const API_KEY = process.env.ILAL_API_KEY;
const CALLS = parseInt(process.env.CALLS || '15', 10);

if (!API_KEY) {
    console.error('❌ ILAL_API_KEY is required. Create one at https://ilal.tech/dashboard/api-keys');
    process.exit(1);
}

const WALLET = '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D';

const ENDPOINTS: Array<{ method: string; path: string; body?: object }> = [
    { method: 'GET', path: `/api/v1/health` },
    { method: 'GET', path: `/api/v1/session/${WALLET}` },
    { method: 'GET', path: `/api/v1/onboarding/status/${WALLET}` },
    {
        method: 'POST', path: '/api/v1/defi/swap',
        body: {
            tokenIn: '0xdd3d112a48906807c4b73c94ed884552427e4cf9',
            tokenOut: '0xfb080423cedd4ca56da3f60a4b901f51846459ae',
            amount: '1000000000000000',
            zeroForOne: true,
            userAddress: WALLET,
        },
    },
];

async function callEndpoint(ep: typeof ENDPOINTS[number]): Promise<{ status: number; ms: number }> {
    const start = Date.now();
    const headers: Record<string, string> = {
        'x-api-key': API_KEY!,
        'Content-Type': 'application/json',
    };
    const opts: RequestInit = { method: ep.method, headers };
    if (ep.body) opts.body = JSON.stringify(ep.body);

    try {
        const res = await fetch(`${API}${ep.path}`, opts);
        return { status: res.status, ms: Date.now() - start };
    } catch {
        return { status: 0, ms: Date.now() - start };
    }
}

async function main() {
    console.log(`\n🌱 Seeding usage data against ${API}`);
    console.log(`   API Key: ${API_KEY!.slice(0, 12)}...`);
    console.log(`   Calls per endpoint: ${CALLS}`);
    console.log(`   Endpoints: ${ENDPOINTS.length}\n`);

    let total = 0;
    let success = 0;

    for (const ep of ENDPOINTS) {
        console.log(`  ${ep.method} ${ep.path}`);
        for (let i = 0; i < CALLS; i++) {
            const result = await callEndpoint(ep);
            total++;
            if (result.status >= 200 && result.status < 400) success++;
            process.stdout.write(`    [${i + 1}/${CALLS}] ${result.status} (${result.ms}ms)\n`);

            // Small delay to avoid overwhelming the API
            await new Promise(r => setTimeout(r, 100));
        }
        console.log('');
    }

    console.log(`✅ Done! ${success}/${total} successful calls seeded.`);
    console.log(`   Check: https://ilal.tech/dashboard/usage\n`);
}

main().catch(console.error);
