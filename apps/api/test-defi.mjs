import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/v1';

async function testDefiOperations() {
    console.log('Testing DeFi Operations via API Key...');

    // 1. Register and Login to get an API Key
    const email = `defi_test_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`\n1. Creating test user & API key...`);
    await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Defi Tester' })
    });

    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const token = (await loginRes.json()).accessToken;

    const createKeyRes = await fetch(`${API_URL}/apikeys`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'Defi Test Key',
            permissions: ['verify', 'session'],
            rateLimit: 10
        })
    });

    const apiKeyData = await createKeyRes.json();
    const apiKey = apiKeyData.apiKey;
    console.log('✅ API Key generated successfully');

    // 2. Test Swap Endpoint
    console.log('\n2. Testing POST /defi/swap');
    const swapPayload = {
        tokenIn: '0x0000000000000000000000000000000000000000', // Mock placeholders since validation requires 0x
        tokenOut: '0x1111111111111111111111111111111111111111',
        amount: '1000000000000000000', // 1 token
        zeroForOne: true,
        userAddress: '0x2222222222222222222222222222222222222222'
    };

    const swapRes = await fetch(`${API_URL}/defi/swap`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}` // Using API Key instead of JWT
        },
        body: JSON.stringify(swapPayload)
    });

    const swapResult = await swapRes.json();
    console.log(`Swap Response Status: ${swapRes.status}`);
    console.log(JSON.stringify(swapResult, null, 2));

    // 3. Test Add Liquidity Endpoint
    console.log('\n3. Testing POST /defi/liquidity');
    const liquidityPayload = {
        token0: '0x0000000000000000000000000000000000000000',
        token1: '0x1111111111111111111111111111111111111111',
        amount0: '1000000000000000000',
        amount1: '1000000000000000000',
        userAddress: '0x2222222222222222222222222222222222222222'
    };

    const liquidityRes = await fetch(`${API_URL}/defi/liquidity`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}` // Using API Key
        },
        body: JSON.stringify(liquidityPayload)
    });

    const liquidityResult = await liquidityRes.json();
    console.log(`Add Liquidity Response Status: ${liquidityRes.status}`);
    console.log(JSON.stringify(liquidityResult, null, 2));

}

testDefiOperations().catch(console.error);
