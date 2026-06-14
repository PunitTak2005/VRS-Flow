const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: String
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Skill', SkillSchema);
