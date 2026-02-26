const CryptoSetting = require('../models/CryptoSetting');

// GET /api/admin/crypto-settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await CryptoSetting.getSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/crypto-settings
exports.updateSettings = async (req, res) => {
  try {
    const { enabled, perPage, vsCurrency } = req.body;

    const settings = await CryptoSetting.getSettings();

    if (enabled !== undefined) settings.enabled = enabled;
    if (perPage !== undefined) {
      if (perPage < 1 || perPage > 50) {
        return res.status(400).json({ success: false, message: 'perPage must be between 1 and 50' });
      }
      settings.perPage = perPage;
    }
    if (vsCurrency) {
      const allowed = ['usd', 'eur', 'bdt'];
      if (!allowed.includes(vsCurrency)) {
        return res.status(400).json({ success: false, message: 'Invalid currency' });
      }
      settings.vsCurrency = vsCurrency;
    }

    await settings.save();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
