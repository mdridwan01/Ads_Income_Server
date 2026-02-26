const Settings = require('../models/Settings');

// Get public settings (no auth required)
exports.getPublicSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // Create default settings if not found
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    res.status(200).json({
      success: true,
      settings: {
        referralBonus: settings.referralBonus,
        cryptoWallets: settings.cryptoWallets || { trc20: '', erc20: '' },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
