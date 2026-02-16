/**
 * 测试 hookData 编码格式
 */

import { encodeAbiParameters, decodeAbiParameters } from 'viem';

const user = '0x1b869CaC69Df23Ad9D727932496AEb3605538c8D';
const deadline = 1770887984n;
const nonce = 0n;
const signature = '0xd40413c5cf6f0e68a635f1bd259a6a8b42b303a3763221abe2b0e78c98735c0d696dee9fea07f175c41cabd01afa750165ce44358781807b0badb580e8e99dd91b' as `0x${string}`;

console.log('测试 hookData 编码...\n');

// 方法 1: 前端当前使用的方法（直接参数编码）
const hookData1 = encodeAbiParameters(
  [
    { type: 'address' },
    { type: 'uint256' },
    { type: 'uint256' },
    { type: 'bytes' },
  ],
  [user, deadline, nonce, signature]
);

console.log('方法 1 (直接参数编码):');
console.log('  长度:', hookData1.length, 'chars');
console.log('  前 200 chars:', hookData1.slice(0, 200));
console.log();

// 方法 2: Struct tuple 编码（Solidity abi.decode 期望的格式）
const hookData2 = encodeAbiParameters(
  [
    {
      type: 'tuple',
      components: [
        { name: 'user', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'signature', type: 'bytes' },
      ],
    },
  ],
  [
    {
      user,
      deadline,
      nonce,
      signature,
    },
  ]
);

console.log('方法 2 (Struct tuple 编码):');
console.log('  长度:', hookData2.length, 'chars');
console.log('  前 200 chars:', hookData2.slice(0, 200));
console.log();

console.log('对比:');
console.log('  是否相同:', hookData1 === hookData2 ? '✅ YES' : '❌ NO');
console.log();

// 尝试解码
console.log('尝试解码 (方法 1 的数据):');
try {
  const decoded1 = decodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    hookData1
  );
  console.log('  ✅ 解码成功:', decoded1);
} catch (e: any) {
  console.log('  ❌ 解码失败:', e.message);
}

console.log();

console.log('尝试解码 (方法 2 的数据):');
try {
  const decoded2 = decodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    hookData2
  );
  console.log('  ✅ 解码成功:', decoded2);
} catch (e: any) {
  console.log('  ❌ 解码失败:', e.message);
}

console.log();
console.log('='.repeat(60));
console.log('结论:');
if (hookData1 === hookData2) {
  console.log('  ✅ 两种编码方式相同，hookData 格式正确');
} else {
  console.log('  ❌ 编码方式不同！需要修改前端使用 tuple 编码');
  console.log('  🔧 修复: 使用方法 2 的编码方式');
}
