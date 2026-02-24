const express = require('express');
const { getPublicSettings } = require('../controllers/publicController');

const router = express.Router();

router.get('/settings', getPublicSettings);

module.exports = router;
