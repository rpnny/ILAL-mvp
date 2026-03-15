import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

const blockchainModule = await import('./blockchain.service.js');
const constantsModule = await import('../config/constants.js');

const { blockchainService } = blockchainModule;
const { CONTRACTS } = constantsModule;

const originalWalletClient = (blockchainService as any).walletClient;
const originalAccount = (blockchainService as any).account;

afterEach(() => {
  (blockchainService as any).walletClient = originalWalletClient;
  (blockchainService as any).account = originalAccount;
});

test('executeContractWrite blocks non-whitelisted relay calls', async () => {
  (blockchainService as any).walletClient = {
    writeContract: async () => '0xnever',
  };
  (blockchainService as any).account = {
    address: '0x1111111111111111111111111111111111111111',
  };

  await assert.rejects(
    blockchainService.executeContractWrite({
      address: CONTRACTS.sessionManager,
      abi: [],
      functionName: 'endSession',
      args: ['0x1111111111111111111111111111111111111111'],
    }),
    /Blocked: relay wallet may only call whitelisted functions/
  );
});

test('executeContractWrite allows whitelisted startSession calls', async () => {
  let called = false;
  (blockchainService as any).walletClient = {
    writeContract: async () => {
      called = true;
      return '0x1234';
    },
  };
  (blockchainService as any).account = {
    address: '0x1111111111111111111111111111111111111111',
  };

  const hash = await blockchainService.executeContractWrite({
    address: CONTRACTS.sessionManager,
    abi: [],
    functionName: 'startSession',
    args: ['0x1111111111111111111111111111111111111111', 123n],
  });

  assert.equal(called, true);
  assert.equal(hash, '0x1234');
});
