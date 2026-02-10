#!/usr/bin/env node

/**
 * ILAL 证明生成脚本
 * 
 * 使用方法:
 *   node generate-proof.js [input.json]
 * 
 * 如果不提供输入文件，使用 input-example.json
 */

const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

async function generateProof(inputFile) {
  console.log('🔐 生成 ILAL 合规证明...\n');

  // 文件路径
  const wasmPath = path.join(__dirname, '../build/compliance_js/compliance.wasm');
  const zkeyPath = path.join(__dirname, '../keys/compliance.zkey');
  const inputPath = inputFile || path.join(__dirname, 'input-example.json');

  // 检查文件是否存在
  if (!fs.existsSync(wasmPath)) {
    console.error('❌ 错误: compliance.wasm 不存在');
    console.error('   请先运行: ./compile.sh');
    process.exit(1);
  }

  if (!fs.existsSync(zkeyPath)) {
    console.error('❌ 错误: compliance.zkey 不存在');
    console.error('   请先运行: ./setup.sh');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 错误: 输入文件不存在: ${inputPath}`);
    process.exit(1);
  }

  console.log('📁 加载输入文件:', inputPath);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  console.log('✅ 输入加载成功\n');

  console.log('📊 输入数据:');
  console.log('  - 用户地址:', input.userAddress);
  console.log('  - KYC 状态:', input.kycStatus);
  console.log('  - 国家代码:', input.countryCode);
  console.log('  - Merkle 索引:', input.merkleIndex);
  console.log('');

  // 生成证明
  console.log('⏳ 生成证明中...');
  const startTime = Date.now();

  const { proof, publicSignals } = await snarkjs.plonk.fullProve(
    input,
    wasmPath,
    zkeyPath
  );

  const elapsedTime = Date.now() - startTime;
  console.log(`✅ 证明生成完成 (耗时: ${elapsedTime}ms)\n`);

  // 保存证明
  const proofPath = path.join(__dirname, 'proof.json');
  const publicPath = path.join(__dirname, 'public.json');

  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));

  console.log('💾 证明已保存:');
  console.log('  - 证明:', proofPath);
  console.log('  - 公共信号:', publicPath);
  console.log('');

  console.log('📤 公共输入:');
  console.log('  - userAddress:', publicSignals[0]);
  console.log('  - merkleRoot:', publicSignals[1]);
  console.log('  - issuerPubKeyHash:', publicSignals[2]);
  console.log('');

  // 本地验证
  console.log('🔍 本地验证证明...');
  const vkeyPath = path.join(__dirname, '../keys/verification_key.json');
  const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));

  const verified = await snarkjs.plonk.verify(vkey, publicSignals, proof);

  if (verified) {
    console.log('✅ 证明验证通过!\n');
  } else {
    console.log('❌ 证明验证失败!\n');
    process.exit(1);
  }

  // 生成 Solidity calldata
  console.log('📝 生成 Solidity calldata...');
  const calldata = await snarkjs.plonk.exportSolidityCallData(proof, publicSignals);
  const calldataPath = path.join(__dirname, 'calldata.txt');
  fs.writeFileSync(calldataPath, calldata);
  console.log('💾 Calldata 已保存:', calldataPath);
  console.log('');

  console.log('🎉 完成!');
  console.log('');
  console.log('下一步:');
  console.log('  1. 在合约中调用 verifyComplianceProof(proof, publicSignals)');
  console.log('  2. 或使用 calldata.txt 中的参数直接调用');
}

// 命令行参数
const inputFile = process.argv[2];

// 执行
generateProof(inputFile).catch((error) => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
