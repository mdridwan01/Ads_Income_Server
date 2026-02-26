const express = require('express');
const { getCrypto } = require('../controllers/cryptoController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getCrypto);

module.exports = router;
