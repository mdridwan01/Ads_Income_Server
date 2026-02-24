const express = require('express');
const {
  getReferralInfo,
  getReferralsList,
  shareReferralLink,
  applyReferralCode,
} = require('../controllers/referralController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/info', protect, getReferralInfo);
router.get('/list', protect, getReferralsList);
router.get('/link', protect, shareReferralLink);
router.post('/apply', protect, applyReferralCode);

module.exports = router;
