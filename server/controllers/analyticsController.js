import { Player } from '../models/Player.js';
import { PlayerMatchStat } from '../models/PlayerMatchStat.js';
import { Match } from '../models/Match.js';
import { User } from '../models/User.js';
import { Club } from '../models/Team.js';
import { ReportEmailRequest } from '../models/ReportEmailRequest.js';

const moneyFmt = (n) => `€${(Number(n || 0) / 1_000_000).toFixed(1)}M`;

export const analystDashboard = async (req, res) => {
  if (!req.user?.clubId) return res.status(400).json({ error: 'Club context missing' });
  const clubId = req.user.clubId;

  const [totalPlayers, totalMatches, latestStats, club] = await Promise.all([
    Player.countDocuments({ clubId }),
    Match.countDocuments({ clubId, status: 'finalized' }),
    PlayerMatchStat.find({ clubId }).sort({ createdAt: -1 }).limit(300),
    Club.findById(clubId),
  ]);

  let injuryAlerts = 0;
  let riskHigh = 0;
  let totalRisk = 0;
  let totalDistance = 0;
  for (const s of latestStats) {
    const risk = Number(s.metrics?.riskScore || 0);
    totalRisk += risk;
    totalDistance += Number(s.metrics?.distanceM || 0);
    if (risk >= 120) {
      injuryAlerts += 1;
      riskHigh += 1;
    }
  }

  return res.json({
    totalPlayers,
    totalMatches,
    videosAnalyzed: club?.videosAnalyzed || 0,
    injuryAlerts,
    riskHigh,
    avgRisk: latestStats.length ? Number((totalRisk / latestStats.length).toFixed(2)) : 0,
    avgDistance: latestStats.length ? Number((totalDistance / latestStats.length).toFixed(2)) : 0,
    marketValue: moneyFmt(club?.marketValueTotal || 0),
  });
};

export const adminDashboard = async (_req, res) => {
  const [totalUsers, totalPlayers, totalMatches, totalClubs, stats] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Player.countDocuments({}),
    Match.countDocuments({ status: 'finalized' }),
    Club.countDocuments({}),
    PlayerMatchStat.find({}).sort({ createdAt: -1 }).limit(600),
  ]);

  const injuryAlerts = stats.filter((s) => Number(s.metrics?.riskScore || 0) >= 120).length;
  const portfolio = stats.reduce((acc, s) => acc + Number(s.metrics?.goals || 0) * 1_000_000, 0);

  return res.json({
    totalUsers,
    totalPlayers,
    totalMatches,
    totalClubs,
    injuryAlerts,
    totalPortfolioValue: moneyFmt(portfolio),
  });
};

export const playerReport = async (req, res) => {
  const globalId = Number(req.params.globalId);
  if (!globalId) return res.status(400).json({ error: 'Invalid globalId' });

  const filter = req.user.role === 'admin' ? { globalId } : { globalId, clubId: req.user.clubId };
  const player = await Player.findOne(filter);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const matchStats = await PlayerMatchStat.find({
    playerId: player._id,
    ...(req.user.role === 'admin' ? {} : { clubId: req.user.clubId }),
  }).sort({ createdAt: -1 });

  const totals = matchStats.reduce(
    (acc, s) => {
      acc.goals += Number(s.metrics?.goals || 0);
      acc.assists += Number(s.metrics?.assists || 0);
      acc.minutesPlayed += Number(s.metrics?.minutesPlayed || 0);
      acc.interceptions += Number(s.metrics?.interceptions || 0);
      acc.tackles += Number(s.metrics?.tackles || 0);
      acc.distanceM += Number(s.metrics?.distanceM || 0);
      acc.hsrM += Number(s.metrics?.hsrM || 0);
      acc.riskScore += Number(s.metrics?.riskScore || 0);
      acc.injuryProbability += Number(s.metrics?.injuryProbability || 0);
      return acc;
    },
    {
      goals: 0,
      assists: 0,
      minutesPlayed: 0,
      interceptions: 0,
      tackles: 0,
      distanceM: 0,
      hsrM: 0,
      riskScore: 0,
      injuryProbability: 0,
    }
  );
  const count = matchStats.length || 1;

  return res.json({
    player: {
      id: String(player._id),
      globalId: player.globalId,
      shirtNumber: player.shirtNumber || player.globalId,
      name: player.name,
      age: player.age,
      position: player.position,
      height: player.physical?.height || 0,
      weight: player.physical?.weight || 0,
      bmi:
        player.physical?.height && player.physical?.weight
          ? Number((player.physical.weight / ((player.physical.height / 100) ** 2)).toFixed(2))
          : 0,
    },
    totals,
    averages: {
      distanceM: Number((totals.distanceM / count).toFixed(2)),
      hsrM: Number((totals.hsrM / count).toFixed(2)),
      riskScore: Number((totals.riskScore / count).toFixed(2)),
      injuryProbability: Number((totals.injuryProbability / count).toFixed(3)),
    },
    byMatch: matchStats.map((s) => ({
      matchId: String(s.matchId),
      globalId: s.globalId,
      metrics: s.metrics,
      date: s.createdAt,
    })),
  });
};

export const playerTrends = async (req, res) => {
  const globalId = Number(req.params.globalId);
  const lastN = Math.max(1, Math.min(20, Number(req.query.lastN || 6)));
  if (!globalId) return res.status(400).json({ error: 'Invalid globalId' });

  const player = await Player.findOne(
    req.user.role === 'admin' ? { globalId } : { globalId, clubId: req.user.clubId }
  );
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const stats = await PlayerMatchStat.find({
    playerId: player._id,
    ...(req.user.role === 'admin' ? {} : { clubId: req.user.clubId }),
  })
    .sort({ createdAt: -1 })
    .limit(lastN);

  return res.json({
    globalId,
    points: stats
      .reverse()
      .map((s) => ({
        date: s.createdAt,
        distanceM: Number(s.metrics?.distanceM || 0),
        hsrM: Number(s.metrics?.hsrM || 0),
        riskScore: Number(s.metrics?.riskScore || 0),
        goals: Number(s.metrics?.goals || 0),
        assists: Number(s.metrics?.assists || 0),
      })),
  });
};

export const queueReportEmail = async (req, res) => {
  const { templateId, format = 'pdf', dateRange = 'month', startDate, endDate } = req.body || {};
  if (!templateId) {
    return res.status(400).json({ error: 'templateId is required' });
  }
  const request = await ReportEmailRequest.create({
    userId: req.user._id,
    clubId: req.user.clubId || null,
    templateId: String(templateId),
    format: String(format),
    dateRange: String(dateRange),
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    status: 'queued',
  });
  return res.status(201).json({
    message: 'Report email request queued',
    requestId: String(request._id),
    status: request.status,
  });
};
