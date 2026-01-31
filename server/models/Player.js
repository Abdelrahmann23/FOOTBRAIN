import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema(
  {
    matches: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    minutesPlayed: { type: Number, default: 0 },
    injuries: { type: Number, default: 0 },
  },
  { _id: false }
);

const physicalSchema = new mongoose.Schema(
  {
    height: { type: Number, default: 0 }, // cm
    weight: { type: Number, default: 0 }, // kg
    sprintSpeed: { type: Number, default: 0 }, // 0-100
    stamina: { type: Number, default: 0 }, // 0-100
    strength: { type: Number, default: 0 }, // 0-100
  },
  { _id: false }
);

const playerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamName: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      default: 0,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    nationality: {
      type: String,
      required: true,
      trim: true,
    },
    stats: {
      type: statsSchema,
      default: () => ({}),
    },
    physical: {
      type: physicalSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: 'players',
  }
);

export const Player = mongoose.model('Player', playerSchema);

