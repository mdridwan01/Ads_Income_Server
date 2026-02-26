const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  badge_name: {
    type: String,
    default: '',
  },
  badge_color: {
    type: String,
    default: '#fff',
  },
  is_active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Static helper to seed default levels if none exist
levelSchema.statics.ensureDefaults = async function () {
  const Level = this;
  const count = await Level.countDocuments();
  if (count === 0) {
    const defaults = [
      { id: 1, name: 'Bronze', price: 10, badge_name: 'Bronze', badge_color: '#cd7f32' },
      { id: 2, name: 'Silver', price: 20, badge_name: 'Silver', badge_color: '#c0c0c0' },
      { id: 3, name: 'Gold', price: 50, badge_name: 'Gold', badge_color: '#ffd700' },
      { id: 4, name: 'Platinum', price: 100, badge_name: 'Platinum', badge_color: '#e5e4e2' },
      { id: 5, name: 'Diamond', price: 200, badge_name: 'Diamond', badge_color: '#b9f2ff' },
    ];
    await Level.insertMany(defaults);
  }
};

module.exports = mongoose.model('Level', levelSchema);
