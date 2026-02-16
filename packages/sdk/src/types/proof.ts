/**
 * ZK Proof 特定类型
 */

export interface MerkleProof {
  root: string;
  leaf: string;
  path: string[];
  indices: number[];
}

export interface PLONKProof {
  A: [string, string];
  B: [[string, string], [string, string]];
  C: [string, string];
  Z: [string, string];
  T1: [string, string];
  T2: [string, string];
  T3: [string, string];
  Wxi: [string, string];
  Wxiw: [string, string];
  eval_a: string;
  eval_b: string;
  eval_c: string;
  eval_s1: string;
  eval_s2: string;
  eval_zw: string;
}

export interface Groth16Proof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: string;
  curve: string;
}

export interface CircuitSignals {
  userAddress: string;
  merkleRoot: string;
  nullifier: string;
  commitment: string;
  timestamp: string;
}

export interface VerificationKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: [string, string];
  vk_beta_2: [[string, string], [string, string]];
  vk_gamma_2: [[string, string], [string, string]];
  vk_delta_2: [[string, string], [string, string]];
  vk_alphabeta_12: [[string, string], [string, string], [string, string]];
  IC: Array<[string, string]>;
}
