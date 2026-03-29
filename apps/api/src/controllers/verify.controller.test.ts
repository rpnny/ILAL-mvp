import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.EXPECTED_MERKLE_ROOT = process.env.EXPECTED_MERKLE_ROOT || '123456789';
process.env.EXPECTED_ISSUER_AX = process.env.EXPECTED_ISSUER_AX || '111';
process.env.EXPECTED_ISSUER_AY = process.env.EXPECTED_ISSUER_AY || '222';

const verifyControllerModule = await import('./verify.controller.ts');
const databaseModule = await import('../config/database.js');
const blockchainModule = await import('../services/blockchain.service.js');

const { verifyAndActivate, renewSession, getSessionStatus } = verifyControllerModule;
const { prisma } = databaseModule;
const { blockchainService } = blockchainModule;

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

const originalProofRecordCreate = prisma.proofRecord.create.bind(prisma.proofRecord);
const originalProofRecordDelete = prisma.proofRecord.delete.bind(prisma.proofRecord);
const originalUserUpdate = prisma.user.update.bind(prisma.user);
const originalUserFindUnique = prisma.user.findUnique.bind(prisma.user);
const originalInstitutionFindUnique = prisma.institution.findUnique.bind(prisma.institution);
const originalIsSessionActive = blockchainService.isSessionActive.bind(blockchainService);
const originalGetRemainingTime = blockchainService.getRemainingTime.bind(blockchainService);
const originalVerifyProof = blockchainService.verifyProof.bind(blockchainService);
const originalStartSession = blockchainService.startSession.bind(blockchainService);

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function makeVerifyRequest(overrides: Partial<Record<string, unknown>> = {}) {
  const wallet = '0x1111111111111111111111111111111111111111';
  const now = Math.floor(Date.now() / 1000);

  return {
    body: {
      userAddress: wallet,
      proof: '0x1234',
      publicInputs: [
        BigInt(wallet).toString(),
        process.env.EXPECTED_MERKLE_ROOT!,
        process.env.EXPECTED_ISSUER_AX!,
        process.env.EXPECTED_ISSUER_AY!,
        now.toString(),
      ],
      ...(overrides.body as object | undefined),
    },
    apiKey: {
      userId: 'user-1',
    },
    user: undefined,
    ...overrides,
  } as any;
}

function restoreMocks() {
  prisma.proofRecord.create = originalProofRecordCreate;
  prisma.proofRecord.delete = originalProofRecordDelete;
  prisma.user.update = originalUserUpdate;
  prisma.user.findUnique = originalUserFindUnique;
  prisma.institution.findUnique = originalInstitutionFindUnique;
  blockchainService.isSessionActive = originalIsSessionActive;
  blockchainService.getRemainingTime = originalGetRemainingTime;
  blockchainService.verifyProof = originalVerifyProof;
  blockchainService.startSession = originalStartSession;
}

afterEach(() => {
  restoreMocks();
});

test('verifyAndActivate rejects duplicate proofHash before expensive verification', async () => {
  const req = makeVerifyRequest();
  const res = createMockResponse();

  prisma.institution.findUnique = async () => ({ userId: 'user-1' } as any);
  blockchainService.isSessionActive = async () => false;
  prisma.proofRecord.create = async () => {
    const error: any = new Error('duplicate');
    error.code = 'P2002';
    throw error;
  };

  let verifyProofCalled = false;
  blockchainService.verifyProof = async () => {
    verifyProofCalled = true;
    return true;
  };

  await verifyAndActivate(req, res as any);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Forbidden',
    message: 'This proof has already been used. Generate a new proof with a fresh timestamp.',
  });
  assert.equal(verifyProofCalled, false);
});

test('verifyAndActivate rolls back reserved proof when verifier rejects proof', async () => {
  const req = makeVerifyRequest();
  const res = createMockResponse();
  let deletedProofHash: string | undefined;

  prisma.institution.findUnique = async () => ({ userId: 'user-1' } as any);
  blockchainService.isSessionActive = async () => false;
  prisma.proofRecord.create = async () => ({ id: 'proof-1' } as any);
  prisma.proofRecord.delete = async ({ where }: any) => {
    deletedProofHash = where.proofHash;
    return {} as any;
  };
  blockchainService.verifyProof = async () => false;

  await verifyAndActivate(req, res as any);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Invalid proof',
    message: 'ZK Proof verification failed',
  });
  assert.ok(deletedProofHash);
});

test('verifyAndActivate rolls back reserved proof when startSession fails', async () => {
  const req = makeVerifyRequest();
  const res = createMockResponse();
  let deletedProofHash: string | undefined;

  prisma.institution.findUnique = async () => ({ userId: 'user-1' } as any);
  blockchainService.isSessionActive = async () => false;
  prisma.proofRecord.create = async () => ({ id: 'proof-1' } as any);
  prisma.proofRecord.delete = async ({ where }: any) => {
    deletedProofHash = where.proofHash;
    return {} as any;
  };
  prisma.user.update = async () => ({ id: 'user-1' } as any);
  blockchainService.verifyProof = async () => true;
  blockchainService.startSession = async () => {
    throw new Error('relay failed');
  };

  await verifyAndActivate(req, res as any);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Session activation failed',
    message: 'relay failed',
  });
  assert.ok(deletedProofHash);
});

test('verifyAndActivate rejects proofs for institutions owned by another account', async () => {
  const req = makeVerifyRequest();
  const res = createMockResponse();
  let verifyProofCalled = false;

  prisma.institution.findUnique = async () => ({ userId: 'user-2' } as any);
  blockchainService.verifyProof = async () => {
    verifyProofCalled = true;
    return true;
  };

  await verifyAndActivate(req, res as any);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Forbidden',
    message: 'You can only verify proofs for institutions owned by your account',
  });
  assert.equal(verifyProofCalled, false);
});

test('renewSession increments renewalCount when prior verification metadata exists', async () => {
  const req = {
    user: {
      userId: 'user-1',
    },
  } as any;
  const res = createMockResponse();
  let incremented = false;

  prisma.user.findUnique = async () => ({
    id: 'user-1',
    walletAddress: '0x1111111111111111111111111111111111111111',
    lastVerifiedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    renewalCount: 1,
  } as any);
  prisma.user.update = async ({ data }: any) => {
    incremented = data.renewalCount.increment === 1;
    return {} as any;
  };
  blockchainService.isSessionActive = async () => true;
  blockchainService.getRemainingTime = async () => 300;
  blockchainService.startSession = async () => ({
    txHash: '0xtx',
    sessionExpiry: 999999n,
    gasUsed: 123n,
  });

  await renewSession(req, res as any);

  assert.equal(res.statusCode, 200);
  assert.equal(incremented, true);
  assert.deepEqual(res.body, {
    success: true,
    message: 'Session renewed successfully.',
    txHash: '0xtx',
    sessionExpiry: '999999',
    remainingSeconds: 24 * 3600,
    renewalsRemaining: 4,
  });
});

test('renewSession rejects accounts without prior ZK verification metadata', async () => {
  const req = {
    user: {
      userId: 'user-1',
    },
  } as any;
  const res = createMockResponse();

  prisma.user.findUnique = async () => ({
    id: 'user-1',
    walletAddress: '0x1111111111111111111111111111111111111111',
    lastVerifiedAt: null,
    renewalCount: 0,
  } as any);

  await renewSession(req, res as any);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    error: 'No prior ZK verification found. Submit a proof via POST /api/v1/verify first.',
  });
});

test('getSessionStatus rejects querying institutions owned by another account', async () => {
  const req = {
    params: { address: '0x1111111111111111111111111111111111111111' },
    user: { userId: 'user-1' },
  } as any;
  const res = createMockResponse();

  prisma.institution.findUnique = async () => ({ userId: 'user-2' } as any);

  await getSessionStatus(req, res as any);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    error: 'Forbidden',
    message: 'You can only query session status for institutions owned by your account',
  });
});
