import { Player } from '../models/Player.js';
import { Team } from '../models/Team.js';

// Helper to map Mongo player to frontend PlayerData shape
const mapPlayerToClient = (playerDoc) => ({
  id: playerDoc._id.toString(),
  name: playerDoc.name,
  age: playerDoc.age,
  position: playerDoc.position,
  team: playerDoc.teamName,
  nationality: playerDoc.nationality,
  stats: {
    matches: playerDoc.stats?.matches ?? 0,
    goals: playerDoc.stats?.goals ?? 0,
    assists: playerDoc.stats?.assists ?? 0,
    minutesPlayed: playerDoc.stats?.minutesPlayed ?? 0,
    injuries: playerDoc.stats?.injuries ?? 0,
  },
  physical: {
    height: playerDoc.physical?.height ?? 0,
    weight: playerDoc.physical?.weight ?? 0,
    sprintSpeed: playerDoc.physical?.sprintSpeed ?? 0,
    stamina: playerDoc.physical?.stamina ?? 0,
    strength: playerDoc.physical?.strength ?? 0,
  },
});

export const listPlayers = async (req, res) => {
  try {
    const teamName = req.user?.teamInfo?.name;

    if (!teamName) {
      return res.status(400).json({
        error: 'User does not have a team configured. Please set a team name during registration.',
      });
    }

    const players = await Player.find({
      user: req.user._id,
      teamName,
    }).sort({ name: 1 });

    res.json({
      players: players.map(mapPlayerToClient),
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({
      error: 'Failed to fetch players',
      details: error.message,
    });
  }
};

export const createPlayer = async (req, res) => {
  try {
    const teamName = req.user?.teamInfo?.name;

    if (!teamName) {
      return res.status(400).json({
        error: 'User does not have a team configured. Please set a team name during registration.',
      });
    }

    const {
      name,
      age,
      position,
      nationality,
      stats = {},
      physical = {},
    } = req.body;

    if (!name || !position || !nationality) {
      return res.status(400).json({
        error: 'Name, position, and nationality are required',
      });
    }

    const player = await Player.create({
      user: req.user._id,
      teamName,
      name,
      age: age ?? 0,
      position,
      nationality,
      stats,
      physical,
    });

    // Increment team's totalPlayers in teams collection
    try {
      await Team.findOneAndUpdate(
        { owner: req.user._id, name: teamName },
        { $inc: { totalPlayers: 1 } },
        { upsert: false }
      );
    } catch (teamError) {
      console.warn('Warning: failed to update team totalPlayers', teamError);
    }

    res.status(201).json({
      message: 'Player created successfully',
      player: mapPlayerToClient(player),
    });
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({
      error: 'Failed to create player',
      details: error.message,
    });
  }
};
