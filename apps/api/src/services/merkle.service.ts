/**
 * Merkle Tree Service — Sparse Poseidon Merkle tree (depth 20)
 *
 * Uses precomputed zero-hashes so we only compute O(N * depth) hashes
 * instead of O(2^depth). Supports tree rotation for smooth proof transitions.
 */

import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { computeLeafHash, getPoseidon } from './issuer.service.js';

const TREE_DEPTH = 20;

let leaves: bigint[] = [];
let zeroHashes: bigint[] = [];
let currentRoot: bigint = 0n;
let previousRoot: bigint | null = null;
let poseidonRef: any = null;

/**
 * Precompute zero hashes: zeroHashes[0] = 0, zeroHashes[i] = H(zeroHashes[i-1], zeroHashes[i-1])
 */
function precomputeZeroHashes(poseidon: any) {
  zeroHashes = new Array(TREE_DEPTH + 1);
  zeroHashes[0] = 0n;
  for (let i = 1; i <= TREE_DEPTH; i++) {
    const h = poseidon([zeroHashes[i - 1], zeroHashes[i - 1]]);
    zeroHashes[i] = poseidon.F.toObject(h) as bigint;
  }
}

/**
 * Compute root from current leaves using sparse hashing.
 * For each level, we only process nodes that have non-zero children.
 */
function computeRoot(poseidon: any): bigint {
  if (leaves.length === 0) return zeroHashes[TREE_DEPTH];

  let level = [...leaves];

  for (let d = 0; d < TREE_DEPTH; d++) {
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : zeroHashes[d];
      const h = poseidon([left, right]);
      next.push(poseidon.F.toObject(h) as bigint);
    }
    level = next;
  }

  return level[0];
}

/**
 * Get Merkle proof for a specific leaf index.
 * Computes siblings on the fly using zero-hash for empty positions.
 */
function computeProof(leafIndex: number, poseidon: any): { siblings: bigint[]; pathIndices: number[] } {
  const siblings: bigint[] = [];
  const pathIndices: number[] = [];

  let level = [...leaves];

  for (let d = 0; d < TREE_DEPTH; d++) {
    const sibIdx = (leafIndex ^ 1); // XOR with 1 gives sibling index at this level
    const sibling = sibIdx < level.length ? level[sibIdx] : zeroHashes[d];
    siblings.push(sibling);
    pathIndices.push(leafIndex & 1);

    // Advance to next level
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : zeroHashes[d];
      const h = poseidon([left, right]);
      next.push(poseidon.F.toObject(h) as bigint);
    }
    level = next;
    leafIndex >>= 1;
  }

  return { siblings, pathIndices };
}

/**
 * Initialize the tree from all approved institutions in the DB.
 * Must be called after issuerService.initialize().
 */
export async function initialize(): Promise<void> {
  poseidonRef = getPoseidon();
  precomputeZeroHashes(poseidonRef);

  const institutions = await prisma.institution.findMany({
    where: { kycStatus: 1 },
    orderBy: { merkleIndex: 'asc' },
  });

  leaves = [];
  for (const inst of institutions) {
    const leaf = await computeLeafHash(inst.walletAddress, inst.kycStatus);
    leaves.push(leaf);
  }

  currentRoot = computeRoot(poseidonRef);
  logger.info('MerkleService initialized', {
    members: leaves.length,
    root: currentRoot.toString().slice(0, 30) + '...',
  });
}

/**
 * Add a new leaf and return its index. Updates current & previous roots.
 */
export async function addLeaf(walletAddress: string, kycStatus: number): Promise<{ leafIndex: number; root: string }> {
  const leaf = await computeLeafHash(walletAddress, kycStatus);

  previousRoot = currentRoot;
  leaves.push(leaf);
  currentRoot = computeRoot(poseidonRef);

  const leafIndex = leaves.length - 1;
  logger.info('Merkle leaf added', {
    leafIndex,
    newRoot: currentRoot.toString().slice(0, 30) + '...',
  });

  return { leafIndex, root: currentRoot.toString() };
}

/**
 * Get Merkle proof for a given leaf index.
 */
export function getProof(leafIndex: number): {
  siblings: string[];
  pathIndices: number[];
  root: string;
} {
  if (leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error(`Leaf index ${leafIndex} out of range (0..${leaves.length - 1})`);
  }

  const { siblings, pathIndices } = computeProof(leafIndex, poseidonRef);

  return {
    siblings: siblings.map(s => s.toString()),
    pathIndices,
    root: currentRoot.toString(),
  };
}

export function getRoot(): bigint {
  return currentRoot;
}

export function getPreviousRoot(): bigint | null {
  return previousRoot;
}

export function getLeafCount(): number {
  return leaves.length;
}
