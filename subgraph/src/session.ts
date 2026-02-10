import { SessionStarted, SessionEnded } from '../generated/SessionManager/SessionManager';
import { Session, GlobalStats, DailyStats } from '../generated/schema';
import { Bytes, BigInt } from '@graphprotocol/graph-ts';

// ============ 会话事件处理 ============

export function handleSessionStarted(event: SessionStarted): void {
  let session = Session.load(event.params.user);
  
  if (!session) {
    session = new Session(event.params.user);
    session.user = event.params.user;
    
    // 更新全局计数
    incrementTotalSessions();
  }
  
  session.expiry = event.params.expiry;
  session.startedAt = event.block.timestamp;
  session.isActive = true;
  session.endedAt = null;
  
  session.save();

  // 更新统计
  updateGlobalStats(event.block.timestamp);
  updateDailyStats(event.block.timestamp, 'newSession');
}

export function handleSessionEnded(event: SessionEnded): void {
  let session = Session.load(event.params.user);
  
  if (session) {
    session.isActive = false;
    session.endedAt = event.block.timestamp;
    session.save();

    // 更新统计
    updateGlobalStats(event.block.timestamp);
  }
}

// ============ 辅助函数 ============

function incrementTotalSessions(): void {
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
    stats.lastUpdated = BigInt.zero();
  }
  
  stats.totalSessions += 1;
  stats.save();
}

function updateGlobalStats(timestamp: BigInt): void {
  let stats = GlobalStats.load(Bytes.fromHexString('0x00'));
  
  if (stats) {
    // TODO: 重新计算活跃会话数
    stats.lastUpdated = timestamp;
    stats.save();
  }
}

function updateDailyStats(timestamp: BigInt, eventType: string): void {
  // 获取日期字符串 (YYYY-MM-DD)
  let dayId = timestamp.toI32() / 86400;
  let id = Bytes.fromI32(dayId);
  
  let daily = DailyStats.load(id);
  
  if (!daily) {
    daily = new DailyStats(id);
    daily.date = getDateString(timestamp);
    daily.dailySwaps = 0;
    daily.dailyVolumeUSD = BigDecimal.zero();
    daily.newSessions = 0;
    daily.expiredSessions = 0;
    daily.timestamp = timestamp;
  }
  
  if (eventType === 'newSession') {
    daily.newSessions += 1;
  }
  
  daily.save();
}

function getDateString(timestamp: BigInt): string {
  // 简化实现，实际应该正确格式化日期
  let daysSinceEpoch = timestamp.toI32() / 86400;
  return 'day-' + daysSinceEpoch.toString();
}
