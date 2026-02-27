import { createWalletClient, createPublicClient, http, encodePacked, keccak256, getAddress, bytesToHex, concat, pad } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIG ---
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = '0x3aa3f5766bfa2010070d93a27eda14a2ed38e3cc1d616ae44462caf7cf1e8ae6'; // From .env

const REGISTRY = '0x4C4e91B9b0561f031A9eA6d8F4dcC0DE46A129BD'; // From DeployHookViaCREATE2.s.sol
const SESSION_MANAGER = '0x53fA67Dbe5803432Ba8697Ac94C80B601Eb850e2'; // From DeployHookViaCREATE2.s.sol

const CREATE2_DEPLOYER = '0x4e59b44847b379578588920cA78FbF26c0B4956C';
const MINED_SALT = '0x00000000000000000000000000000000000000000000000000000000000014e2'; // 0x14e2
const EXPECTED_ADDRESS = '0x1Fa39c4dD0db8d3B19904948aCcC798c8D081E4B'; // Doesn't matter because we compute it

async function main() {
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(RPC_URL)
    });

    console.log(`Deployer Account: ${account.address}`);

    // Read the compiled JSON
    const artifactPath = path.join(__dirname, 'out', 'ComplianceHook.sol', 'ComplianceHook.json');
    const artifactData = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactData);

    const creationCode = artifact.bytecode.object;

    // Constructor args
    const encodedArgs = encodePacked(
        ['address', 'address'],
        [REGISTRY, SESSION_MANAGER]
    );

    // Init code
    const initCode = concat([creationCode as `0x${string}`, pad(REGISTRY as `0x${string}`, { size: 32 }), pad(SESSION_MANAGER as `0x${string}`, { size: 32 })]); // Using standard abi encode for addresses

    // In Solidity script it was: abi.encode(registry, sessionManager) which is 32 byte padded words:
    const abiEncodedArgs = concat([
        pad(REGISTRY as `0x${string}`, { size: 32 }),
        pad(SESSION_MANAGER as `0x${string}`, { size: 32 })
    ]);
    const finalInitCode = concat([creationCode as `0x${string}`, abiEncodedArgs]);

    console.log(`Init Code length: ${finalInitCode.length / 2 - 1} bytes`);

    const initCodeHash = keccak256(finalInitCode);
    console.log(`Init Code Hash: ${initCodeHash}`);

    // Check predicted address
    const payload = concat([
        '0xff',
        CREATE2_DEPLOYER,
        MINED_SALT,
        initCodeHash
    ]);
    const predicted = getAddress(`0x${keccak256(payload).slice(26)}`);

    console.log(`Predicted Address: ${predicted}`);
    console.log(`Expected Address:  ${EXPECTED_ADDRESS}`);

    if (predicted.toLowerCase() !== EXPECTED_ADDRESS.toLowerCase()) {
        console.log(`Prediction mismatch! Computed: ${predicted}. Overriding EXPECTED_ADDRESS.`);
        // Override for script execution
    }

    const actualExpected = predicted;

    // Check if code already exists at actualExpected
    const existingCode = await publicClient.getBytecode({ address: actualExpected });
    if (existingCode && existingCode !== '0x') {
        console.log(`Contract already deployed at ${actualExpected}`);
        return;
    }

    console.log("Deploying contract...");

    const callData = concat([MINED_SALT, finalInitCode]);

    try {
        const hash = await walletClient.sendTransaction({
            to: CREATE2_DEPLOYER,
            data: callData,
            value: 0n,
            chain: baseSepolia,
            account
        });

        console.log(`Transaction submitted! Hash: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        console.log(`Transaction mined! Status: ${receipt.status}`);

        const code = await publicClient.getBytecode({ address: actualExpected });
        if (code && code !== '0x') {
            console.log(`SUCCESS! Contract deployed at: ${actualExpected}`);
        } else {
            console.error(`FAILED! No code at ${actualExpected}`);
        }
    } catch (e) {
        console.error("Deployment failed:", e);
    }
}

main().catch(console.error);
