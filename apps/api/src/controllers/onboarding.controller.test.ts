import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET || 'test-api-key-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

const { getStatus, getAttestation } = await import('./onboarding.controller.ts');
const { prisma } = await import('../config/database.js');

const origInstFindUnique = prisma.institution.findUnique.bind(prisma.institution);

afterEach(() => {
  prisma.institution.findUnique = origInstFindUnique;
});

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
}

const VALID_ADDR = '0x' + 'aB'.repeat(20);

// ── getStatus ──

test('getStatus returns not_registered for unknown address', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => null;

  await getStatus(
    { params: { address: VALID_ADDR } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).status, 'not_registered');
});

test('getStatus returns approved for registered institution', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({
    id: 'inst1', name: 'Test', walletAddress: VALID_ADDR,
    kycStatus: 1, countryCode: 840, merkleIndex: 0,
    approvedAt: '2026-01-01', createdAt: '2026-01-01',
  } as any);

  await getStatus(
    { params: { address: VALID_ADDR } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).status, 'approved');
  assert.equal((res.body as any).name, 'Test');
});

test('getStatus returns pending for non-approved institution', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({
    id: 'inst1', name: 'Pending Corp', walletAddress: VALID_ADDR,
    kycStatus: 0, countryCode: 840, merkleIndex: null,
    approvedAt: null, createdAt: '2026-01-01',
  } as any);

  await getStatus(
    { params: { address: VALID_ADDR } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as any).status, 'pending');
});

test('getStatus rejects invalid address format', async () => {
  const res = createMockResponse();
  await getStatus(
    { params: { address: 'bad' } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 400);
});

test('getStatus rejects missing address param', async () => {
  const res = createMockResponse();
  await getStatus(
    { params: { address: '' } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 400);
});

// ── getAttestation ──

test('getAttestation returns 404 for unregistered wallet', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => null;

  await getAttestation(
    { params: { address: VALID_ADDR } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 404);
});

test('getAttestation returns 404 for non-approved institution', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({
    id: 'inst1', walletAddress: VALID_ADDR, kycStatus: 0,
    countryCode: 840, merkleIndex: null,
  } as any);

  await getAttestation(
    { params: { address: VALID_ADDR } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 404);
});

test('getAttestation returns 500 when merkle index is missing', async () => {
  const res = createMockResponse();
  prisma.institution.findUnique = async () => ({
    id: 'inst1', walletAddress: VALID_ADDR, kycStatus: 1,
    countryCode: 840, merkleIndex: null,
  } as any);

  await getAttestation(
    { params: { address: VALID_ADDR } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 500);
  assert.ok((res.body as any).message.includes('merkle'));
});

test('getAttestation rejects invalid address', async () => {
  const res = createMockResponse();
  await getAttestation(
    { params: { address: 'invalid' } } as any,
    res as any,
  );
  assert.equal(res.statusCode, 400);
});
