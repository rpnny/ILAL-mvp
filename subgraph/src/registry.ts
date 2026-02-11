import {
  IssuerRegistered,
  IssuerUpdated,
  IssuerRevoked,
  RouterApproved,
  EmergencyPauseToggled,
  UserVerified
} from '../generated/Registry/Registry';
import { Issuer, Router, EmergencyEvent, GlobalStats, Session } from '../generated/schema';
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

// ============ Issuer 事件处理 ============

export function handleIssuerRegistered(event: IssuerRegistered): void {
  let issuer = new Issuer(event.params.issuerId);

  issuer.admin = event.params.attester;
  issuer.easAddress = event.params.verifier;
  issuer.schemaId = event.params.issuerId;
  issuer.isActive = true;
  issuer.registeredAt = event.block.timestamp;

  issuer.save();

  let stats = getOrCreateGlobalStats();
  stats.totalIssuers = stats.totalIssuers + 1;
  stats.activeIssuers = stats.activeIssuers + 1;
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleIssuerUpdated(event: IssuerUpdated): void {
  let issuer = Issuer.load(event.params.issuerId);

  if (issuer != null) {
    issuer.easAddress = event.params.newVerifier;
    issuer.save();
  }
}

export function handleIssuerRevoked(event: IssuerRevoked): void {
  let issuer = Issuer.load(event.params.issuerId);

  if (issuer != null) {
    issuer.isActive = false;
    issuer.revokedAt = event.block.timestamp;
    issuer.save();
  }

  let stats = getOrCreateGlobalStats();
  if (stats.activeIssuers > 0) {
    stats.activeIssuers = stats.activeIssuers - 1;
  }
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

// ============ 路由器事件处理 ============

export function handleRouterApproved(event: RouterApproved): void {
  let router = Router.load(event.params.router);

  if (router == null) {
    router = new Router(event.params.router);
    router.address = event.params.router;
    router.approvedAt = event.block.timestamp;
  }

  router.isApproved = event.params.approved;

  if (!event.params.approved) {
    router.revokedAt = event.block.timestamp;
  }

  router.save();
}

// ============ 紧急事件处理 ============

export function handleEmergencyPauseToggled(event: EmergencyPauseToggled): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let emergencyEvent = new EmergencyEvent(id);

  emergencyEvent.isPaused = event.params.paused;
  emergencyEvent.timestamp = event.block.timestamp;
  emergencyEvent.blockNumber = event.block.number;
  emergencyEvent.triggeredBy = event.transaction.from;

  emergencyEvent.save();
}

// ============ 用户验证事件处理 ============

export function handleUserVerified(event: UserVerified): void {
  let session = Session.load(event.params.user);

  if (session == null) {
    session = new Session(event.params.user);
    session.user = event.params.user;
    session.isActive = false;
    session.expiry = BigInt.zero();
    session.startedAt = BigInt.zero();

    let stats = getOrCreateGlobalStats();
    stats.totalSessions = stats.totalSessions + 1;
    stats.save();
  }

  session.expiry = event.params.expiry;
  session.startedAt = event.block.timestamp;
  session.isActive = true;
  session.endedAt = null;

  session.save();

  let stats = getOrCreateGlobalStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}
