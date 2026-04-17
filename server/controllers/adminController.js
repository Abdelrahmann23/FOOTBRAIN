import { User } from '../models/User.js';
import { Club } from '../models/Team.js';
import { Player } from '../models/Player.js';
import { Match } from '../models/Match.js';
import { ensureClubByName } from '../services/club.service.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@footbrain.com';

const mapUser = (userDoc) => ({
  id: String(userDoc._id),
  email: userDoc.email,
  name: userDoc.name,
  role: userDoc.role,
  clubId: userDoc.clubId ? String(userDoc.clubId) : null,
  teamInfo: userDoc.teamInfo || undefined,
});

export const listUsers = async (req, res) => {
  try {
    const [users, playerCounts] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }),
      Player.aggregate([
        {
          $group: {
            _id: '$user',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const countsByUserId = new Map(
      playerCounts.map((pc) => [pc._id.toString(), pc.count])
    );

    res.json({
      users: users.map((userDoc) => ({
        ...mapUser(userDoc),
        playerCount: countsByUserId.get(userDoc._id.toString()) || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message,
    });
  }
};

export const stats = async (req, res) => {
  try {
    const [totalUsers, totalPlayers, totalClubs, totalMatches] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Player.countDocuments({}),
      Club.countDocuments({}),
      Match.countDocuments({}),
    ]);

    res.json({
      totalUsers,
      totalPlayers,
      totalClubs,
      totalMatches,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      error: 'Failed to fetch admin stats',
      details: error.message,
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { email, password, name, role = 'user', teamName } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required',
      });
    }

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({
        error: 'Team name is required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        error: 'User with this email already exists',
      });
    }

    const user = new User({
      email: normalizedEmail,
      password,
      name: String(name).trim(),
      role: role === 'admin' ? 'admin' : 'user',
      teamInfo: {
        name: String(teamName).trim(),
        totalPlayers: 0,
        injuryAlerts: 0,
        marketValue: '€0M',
        videosAnalyzed: 0,
      },
    });

    await user.save();

    const club = await ensureClubByName(String(teamName).trim(), user._id);
    user.clubId = club._id;
    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: mapUser(user),
    });
  } catch (error) {
    console.error('Error creating user for admin:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const emailParam = req.params.email.toLowerCase();
    const { name, role, teamName, password } = req.body;

    const user = await User.findOne({ email: emailParam });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email === ADMIN_EMAIL && role && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change main admin role' });
    }

    if (name && typeof name === 'string') {
      user.name = name.trim();
    }

    if (role && (role === 'user' || role === 'admin')) {
      user.role = role;
    }

    if (teamName && typeof teamName === 'string') {
      if (!user.teamInfo) {
        user.teamInfo = {};
      }
      user.teamInfo.name = teamName.trim();
      const club = await ensureClubByName(teamName.trim(), user._id);
      user.clubId = club._id;
    }

    if (password && typeof password === 'string') {
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Password must be at least 6 characters long',
        });
      }
      user.password = password; // will be hashed by pre-save hook
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: mapUser(user),
    });
  } catch (error) {
    console.error('Error updating user for admin:', error);
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const emailParam = req.params.email.toLowerCase();

    if (emailParam === ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({
        error: 'Cannot delete main admin user',
      });
    }

    // Find and delete user so we have their _id for cascading deletes
    const user = await User.findOneAndDelete({ email: emailParam });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cascade delete: remove this user's players and matches
    try {
      await Promise.all([
        Player.deleteMany({ user: user._id }),
        Match.deleteMany({ createdBy: user._id }),
      ]);
    } catch (cascadeError) {
      console.error('Error deleting related players/matches:', cascadeError);
      return res.status(500).json({
        error: 'User deleted, but failed to remove related players/matches',
        details: cascadeError.message,
      });
    }

    res.json({ message: 'User, players, and matches deleted successfully' });
  } catch (error) {
    console.error('Error deleting user for admin:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      details: error.message,
    });
  }
};