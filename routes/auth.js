const express = require('express');
const { register, login, verifyToken, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', protect, verifyToken);
router.post('/logout', logout);

module.exports = router;
