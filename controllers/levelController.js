const Level = require('../models/Level');
const User = require('../models/User');

// get all levels (public)
exports.getLevels = async (req, res) => {
  try {
    const levels = await Level.find().sort({ id: 1 });
    res.status(200).json({ success: true, levels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// get single level (admin)
exports.getLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const level = await Level.findOne({ id: parseInt(id) });
    if (!level) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }
    res.status(200).json({ success: true, level });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// admin: create new level
exports.createLevel = async (req, res) => {
  try {
    const { id, name, price, badge_color, is_active } = req.body;
    const exists = await Level.findOne({ id: parseInt(id) });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Level with that ID already exists' });
    }
    const level = new Level({ id, name, price, badge_color, is_active });
    await level.save();
    res.status(201).json({ success: true, level });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// admin: delete level
exports.deleteLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Level.findOneAndDelete({ id: parseInt(id) });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }
    res.status(200).json({ success: true, message: 'Level deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// admin: update level settings
exports.updateLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // price, badge_name, badge_color, is_active

    const level = await Level.findOneAndUpdate({ id: parseInt(id) }, updates, { new: true });
    if (!level) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }
    res.status(200).json({ success: true, level });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// admin: manually set user level
exports.setUserLevel = async (req, res) => {
  try {
    const { userId } = req.params;
    const { level } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.level = level;
    await user.save();
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
