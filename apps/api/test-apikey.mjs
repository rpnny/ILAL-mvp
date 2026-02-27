import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/v1';

async function testApiKeyGeneration() {
    console.log('Testing API Key Generation Flow...');

    // 1. Register a test user
    const email = `test_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`\n1. Registering new user: ${email}`);
    const registerRes = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Test User' })
    });

    const registerData = await registerRes.json();
    if (!registerRes.ok) {
        console.error('Registration failed:', registerData);
        return;
    }
    console.log('Registration successful');

    // 2. Login to get token
    console.log('\n2. Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
        console.error('Login failed:', loginData);
        return;
    }

    const token = loginData.accessToken;
    console.log('Login successful, got access token');

    // 3. Create API Key
    console.log('\n3. Creating API Key...');
    const createKeyRes = await fetch(`${API_URL}/apikeys`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'My Test Key',
            permissions: ['verify', 'session'],
            rateLimit: 10
        })
    });

    const createKeyData = await createKeyRes.json();
    if (!createKeyRes.ok) {
        console.error('Failed to create API key:', createKeyData);
        return;
    }

    console.log('\n✅ SUCCESS! API Key created:');
    console.log('-----------------------------------');
    console.log(JSON.stringify(createKeyData, null, 2));
    console.log('-----------------------------------');

    // 4. List API Keys to verify
    console.log('\n4. Verifying key appears in list...');
    const listKeysRes = await fetch(`${API_URL}/apikeys`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const listKeysData = await listKeysRes.json();
    if (!listKeysRes.ok) {
        console.error('Failed to list API keys:', listKeysData);
        return;
    }

    console.log(`Found ${listKeysData.apiKeys?.length} keys.`);
    console.log(JSON.stringify(listKeysData, null, 2));

    console.log('\nTest complete.');
}

testApiKeyGeneration().catch(console.error);
