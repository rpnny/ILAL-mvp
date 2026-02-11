#!/usr/bin/env node

/**
 * 子图配置准备脚本
 * 根据网络配置文件更新 subgraph.yaml
 * 
 * 用法: node scripts/prepare.js <network>
 * 示例: node scripts/prepare.js base-sepolia
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const network = process.argv[2];

if (!network) {
  console.error('请指定网络: node scripts/prepare.js <network>');
  console.error('可用网络: base-sepolia, base-mainnet');
  process.exit(1);
}

const configPath = path.join(__dirname, '..', 'config', `${network}.json`);
const subgraphPath = path.join(__dirname, '..', 'subgraph.yaml');

// 检查配置文件是否存在
if (!fs.existsSync(configPath)) {
  console.error(`配置文件不存在: ${configPath}`);
  process.exit(1);
}

// 读取配置
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const subgraph = yaml.parse(fs.readFileSync(subgraphPath, 'utf8'));

console.log(`准备 ${network} 网络配置...`);

// 更新每个数据源
subgraph.dataSources.forEach((dataSource) => {
  const contractConfig = config.contracts[dataSource.name];
  
  if (contractConfig) {
    dataSource.network = config.network;
    dataSource.source.address = contractConfig.address;
    dataSource.source.startBlock = contractConfig.startBlock;
    
    console.log(`  ${dataSource.name}: ${contractConfig.address} (block ${contractConfig.startBlock})`);
  }
});

// 写回 subgraph.yaml
fs.writeFileSync(subgraphPath, yaml.stringify(subgraph));

console.log('配置更新完成！');
console.log('');
console.log('下一步:');
console.log('  1. npm run codegen');
console.log('  2. npm run build');
console.log('  3. npm run deploy');
