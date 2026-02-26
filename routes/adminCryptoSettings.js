const express = require('express');
const { getSettings, updateSettings } = require('../controllers/cryptoSettingsController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, adminOnly, getSettings);
router.put('/', protect, adminOnly, updateSettings);

module.exports = router;
