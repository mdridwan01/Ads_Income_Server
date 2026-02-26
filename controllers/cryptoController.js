const { fetchRates, getRatesWithSettings } = require('../services/cryptoService');

// GET /api/crypto
exports.getCrypto = async (req, res) => {
  try {
    const { vs_currency, per_page } = req.query;

    // if admin toggled off or using settings
    if (vs_currency || per_page) {
      // override settings if provided via query; still respect enabled flag
      const rates = await fetchRates(vs_currency || 'usd', per_page || 20);
      return res.status(200).json({ success: true, data: rates });
    }

    const rates = await getRatesWithSettings();
    res.status(200).json({ success: true, data: rates });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
