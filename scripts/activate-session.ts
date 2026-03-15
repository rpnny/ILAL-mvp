/**
 * Activate a session for the operator wallet via ZK proof generation + API verify.
 */
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const envRaw = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8');
const PRIVATE_KEY = envRaw.match(/PRIVATE_KEY=(.+)/)![1].trim();

const apiEnvRaw = fs.readFileSync(path.join(ROOT, 'apps/api/.env'), 'utf-8');
function env(key: string): string {
  const m = apiEnvRaw.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, 'm'));
  if (!m) throw new Error(`Missing env: ${key}`);
  return m[1].trim();
}

const API_BASE = 'http://localhost:3001/api/v1';

async function main() {
  const { privateKeyToAccount } = await import('viem/accounts');
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log(`Wallet: ${account.address}`);

  // 1. Check current session
  const sessRes = await fetch(`${API_BASE}/session/${account.address}`);
  const sess = await sessRes.json();
  if (sess.isActive) {
    console.log(`Session already active. Remaining: ${sess.remainingSeconds}s`);
    return;
  }
  console.log('Session inactive. Generating ZK proof...');

  // 2. Generate ZK proof
  const require2 = createRequire(path.join(ROOT, 'packages/circuits/package.json'));
  const snarkjs = require2('snarkjs');

  const input = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/circuits/test-data/test-input.json'), 'utf8'));
  const wasmPath = path.join(ROOT, 'packages/circuits/build/compliance_js/compliance.wasm');
  const zkeyPath = path.join(ROOT, 'packages/circuits/keys/compliance.zkey');

  const { proof, publicSignals } = await snarkjs.plonk.fullProve(input, wasmPath, zkeyPath);
  console.log('ZK proof generated.');
  console.log('Public signals:', publicSignals);

  const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
  const [proofHex, ...rest] = calldata.split(',');

  // 3. Register + login to get JWT
  const uid = `activate_${Date.now()}`;
  const email = `${uid}@session.test`;
  const password = 'ActivateSession!123';

  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Session Activator' }),
  });
  const regData = await regRes.json();
  const jwt = regData.accessToken || regData.token;
  if (!jwt) {
    console.error('Failed to get JWT:', regData);
    return;
  }
  console.log('JWT obtained.');

  // 4. Submit proof to /verify
  const verifyRes = await fetch(`${API_BASE}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      proof: proofHex.replace(/"/g, ''),
      publicSignals,
      userAddress: account.address,
    }),
  });
  const verifyData = await verifyRes.json();
  console.log(`Verify response (${verifyRes.status}):`, JSON.stringify(verifyData, null, 2));

  // 5. Check session again
  const sessRes2 = await fetch(`${API_BASE}/session/${account.address}`);
  const sess2 = await sessRes2.json();
  console.log(`Session active: ${sess2.isActive}, remaining: ${sess2.remainingSeconds}s`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
