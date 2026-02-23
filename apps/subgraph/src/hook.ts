import {
  SwapAttempt as SwapAttemptEvent,
  LiquidityAttempt as LiquidityAttemptEvent
} from '../generated/ComplianceHook/ComplianceHook';
import {
  SwapAttempt,
  LiquidityAttempt,
  Session,
  GlobalStats,
  DailyStats
} from '../generated/schema';
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

// ============ Swap 事件处理 ============

export function handleSwapAttempt(event: SwapAttemptEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let swapAttempt = new SwapAttempt(id.toHexString());

  swapAttempt.user = event.params.user;
  swapAttempt.allowed = event.params.allowed;
  swapAttempt.timestamp = event.block.timestamp;
  swapAttempt.blockNumber = event.block.number;
  swapAttempt.txHash = event.transaction.hash;

  // 关联会话
  let session = Session.load(event.params.user);
  if (session != null) {
    swapAttempt.session = session.id;
  }

  swapAttempt.save();

  // 更新全局统计
  let stats = getOrCreateGlobalStats();
  stats.totalSwapAttempts = stats.totalSwapAttempts + 1;
  if (event.params.allowed) {
    stats.allowedSwaps = stats.allowedSwaps + 1;
  }
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  // 更新日统计
  let daily = getOrCreateDailyStats(event.block.timestamp);
  daily.dailySwapAttempts = daily.dailySwapAttempts + 1;
  daily.save();
}

// ============ Liquidity 事件处理 ============

export function handleLiquidityAttempt(event: LiquidityAttemptEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let liquidityAttempt = new LiquidityAttempt(id.toHexString());

  liquidityAttempt.user = event.params.user;
  liquidityAttempt.allowed = event.params.allowed;
  liquidityAttempt.isAdd = event.params.isAdd;
  liquidityAttempt.timestamp = event.block.timestamp;
  liquidityAttempt.blockNumber = event.block.number;
  liquidityAttempt.txHash = event.transaction.hash;

  // 关联会话
  let session = Session.load(event.params.user);
  if (session != null) {
    liquidityAttempt.session = session.id;
  }

  liquidityAttempt.save();

  // 更新全局统计
  let stats = getOrCreateGlobalStats();
  stats.totalLiquidityAttempts = stats.totalLiquidityAttempts + 1;
  if (event.params.allowed) {
    stats.allowedLiquidityOps = stats.allowedLiquidityOps + 1;
  }
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  // 更新日统计
  let daily = getOrCreateDailyStats(event.block.timestamp);
  daily.dailyLiquidityAttempts = daily.dailyLiquidityAttempts + 1;
  daily.save();
}
