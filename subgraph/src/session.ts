import { SessionStarted, SessionEnded } from '../generated/SessionManager/SessionManager';
import { Session, GlobalStats, DailyStats } from '../generated/schema';
import { Bytes, BigInt } from '@graphprotocol/graph-ts';

let GLOBAL_STATS_ID = Bytes.fromHexString('0x00');

// ============ 全局统计辅助 ============

function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load(GLOBAL_STATS_ID);

  if (stats == null) {
    stats = new GlobalStats(GLOBAL_STATS_ID);
    stats.totalIssuers = 0;
    stats.activeIssuers = 0;
    stats.totalSessions = 0;
    stats.activeSessions = 0;
    stats.totalSwapAttempts = 0;
    stats.totalLiquidityAttempts = 0;
    stats.allowedSwaps = 0;
    stats.allowedLiquidityOps = 0;
    stats.lastUpdated = BigInt.zero();
    stats.save();
  }

  return stats;
}

// ============ 日统计辅助 ============

function getOrCreateDailyStats(timestamp: BigInt): DailyStats {
  let dayId = timestamp.toI32() / 86400;
  let id = Bytes.fromI32(dayId);

  let daily = DailyStats.load(id);

  if (daily == null) {
    daily = new DailyStats(id);
    daily.date = 'day-' + dayId.toString();
    daily.dailySwapAttempts = 0;
    daily.dailyLiquidityAttempts = 0;
    daily.newSessions = 0;
    daily.expiredSessions = 0;
    daily.timestamp = BigInt.fromI32(dayId * 86400);
    daily.save();
  }

  return daily;
}

// ============ 会话事件处理 ============

export function handleSessionStarted(event: SessionStarted): void {
  let session = Session.load(event.params.user);

  let isNewSession = session == null;

  if (session == null) {
    session = new Session(event.params.user);
    session.user = event.params.user;
  }

  session.expiry = event.params.expiry;
  session.startedAt = event.block.timestamp;
  session.isActive = true;
  session.endedAt = null;

  session.save();

  // 更新全局统计
  let stats = getOrCreateGlobalStats();
  if (isNewSession) {
    stats.totalSessions = stats.totalSessions + 1;
  }
  stats.activeSessions = stats.activeSessions + 1;
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  // 更新日统计
  let daily = getOrCreateDailyStats(event.block.timestamp);
  daily.newSessions = daily.newSessions + 1;
  daily.save();
}

export function handleSessionEnded(event: SessionEnded): void {
  let session = Session.load(event.params.user);

  if (session != null) {
    session.isActive = false;
    session.endedAt = event.block.timestamp;
    session.save();

    // 更新全局统计
    let stats = getOrCreateGlobalStats();
    if (stats.activeSessions > 0) {
      stats.activeSessions = stats.activeSessions - 1;
    }
    stats.lastUpdated = event.block.timestamp;
    stats.save();

    // 更新日统计
    let daily = getOrCreateDailyStats(event.block.timestamp);
    daily.expiredSessions = daily.expiredSessions + 1;
    daily.save();
  }
}
