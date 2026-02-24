const express = require('express');
const {
  startAd,
  completeAd,
  getAdsHistory,
  getAvailableAds,
  createAd,
  updateAd,
  deleteAd,
} = require('../controllers/adsController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/start', protect, startAd);
router.put('/:adHistoryId/complete', protect, completeAd);
router.get('/history', protect, getAdsHistory);
router.get('/available', protect, getAvailableAds);

// Admin routes
router.post('/', protect, adminOnly, createAd);
router.put('/:adId', protect, adminOnly, updateAd);
router.delete('/:adId', protect, adminOnly, deleteAd);

module.exports = router;
