/**
 * 外部模块类型声明
 */

declare module 'snarkjs' {
  export const groth16: any;
  export const plonk: any;
}

declare module 'circomlibjs' {
  export function buildPoseidon(): Promise<any>;
}

// 浏览器环境全局变量
declare const window: any | undefined;
