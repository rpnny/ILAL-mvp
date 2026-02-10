import { 
  IssuerRegistered, 
  IssuerUpdated, 
  IssuerRevoked,
  RouterApproved,
  EmergencyPauseToggled
} from '../generated/Registry/Registry';
import { Issuer, Router, EmergencyEvent, GlobalStats } from '../generated/schema';
import { Bytes, BigInt } from '@graphprotocol/graph-ts';

// ============ Issuer 事件处理 ============

export function handleIssuerRegistered(event: IssuerRegistered): void {
  let issuer = new Issuer(event.params.issuerId);
  
  issuer.attester = event.params.attester;
  issuer.verifier = event.params.verifier;
  issuer.active = true;
  issuer.registeredAt = event.block.timestamp;
  issuer.updatedAt = event.block.timestamp;
  
  issuer.save();

  // 更新全局统计
  updateGlobalStats(event.block.timestamp);
}

export function handleIssuerUpdated(event: IssuerUpdated): void {
  let issuer = Issuer.load(event.params.issuerId);
  
  if (issuer) {
    issuer.verifier = event.params.newVerifier;
    issuer.updatedAt = event.block.timestamp;
    issuer.save();
  }
}

export function handleIssuerRevoked(event: IssuerRevoked): void {
  let issuer = Issuer.load(event.params.issuerId);
  
  if (issuer) {
    issuer.active = false;
    issuer.revokedAt = event.block.timestamp;
    issuer.updatedAt = event.block.timestamp;
    issuer.save();
  }

  updateGlobalStats(event.block.timestamp);
}

// ============ 路由器事件处理 ============

export function handleRouterApproved(event: RouterApproved): void {
  let router = Router.load(event.params.router);
  
  if (!router) {
    router = new Router(event.params.router);
    router.approvedAt = event.block.timestamp;
  }
  
  router.approved = event.params.approved;
  
  if (!event.params.approved && router.revokedAt == null) {
    router.revokedAt = event.block.timestamp;
  }
  
  router.save();
}

// ============ 紧急事件处理 ============

export function handleEmergencyPauseToggled(event: EmergencyPauseToggled): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let emergencyEvent = new EmergencyEvent(id);
  
  emergencyEvent.paused = event.params.paused;
  emergencyEvent.timestamp = event.block.timestamp;
  emergencyEvent.blockNumber = event.block.number;
  emergencyEvent.txHash = event.transaction.hash;
  emergencyEvent.triggeredBy = event.transaction.from;
  
  emergencyEvent.save();
}

// ============ 辅助函数 ============

function updateGlobalStats(timestamp: BigInt): void {
  let stats = GlobalStats.load(Bytes.fromHexString('0x00'));
  
  if (!stats) {
    stats = new GlobalStats(Bytes.fromHexString('0x00'));
    stats.totalIssuers = 0;
    stats.activeIssuers = 0;
    stats.totalSessions = 0;
    stats.activeSessions = 0;
    stats.totalSwaps = 0;
    stats.totalLiquidityPositions = 0;
    stats.totalVolumeUSD = BigDecimal.zero();
    stats.totalLiquidityUSD = BigDecimal.zero();
  }
  
  // 重新计算活跃 Issuer 数量
  // TODO: 实现实际计数逻辑
  
  stats.lastUpdated = timestamp;
  stats.save();
}
