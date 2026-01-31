import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalPlayers: {
      type: Number,
      default: 0,
    },
    injuryAlerts: {
      type: Number,
      default: 0,
    },
    marketValue: {
      type: String,
      default: '€0M',
    },
    videosAnalyzed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'teams',
  }
);

teamSchema.index({ owner: 1, name: 1 }, { unique: true });

export const Team = mongoose.model('Team', teamSchema);

