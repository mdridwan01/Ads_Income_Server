const AdsHistory = require('../models/AdsHistory');
const User = require('../models/User');
const Ads = require('../models/Ads');

// Start watching an ad
exports.startAd = async (req, res) => {
  try {
    const { adId, adType } = req.body;
    const userId = req.user.id;

    const ad = await Ads.findById(adId);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found',
      });
    }

    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress;

    const adsHistory = new AdsHistory({
      userId,
      adType: adType || ad.adType,
      amountEarned: ad.rewardAmount,
      adProviderId: ad.providerAdId,
      status: 'started',
      ipAddress,
      deviceInfo,
      adTitle: ad.title,
      adDescription: ad.description,
    });

    await adsHistory.save();
    ad.viewCount += 1;
    await ad.save();

    res.status(201).json({
      success: true,
      message: 'Ad started',
      adsHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Complete watching an ad
exports.completeAd = async (req, res) => {
  try {
    const { adHistoryId } = req.params;
    const userId = req.user.id;

    const adsHistory = await AdsHistory.findById(adHistoryId);

    if (!adsHistory) {
      return res.status(404).json({
        success: false,
        message: 'Ad history not found',
      });
    }

    // Update ad history
    adsHistory.status = 'completed';
    adsHistory.completionTime = new Date();
    await adsHistory.save();

    // Update ad completion count
    const ad = await Ads.findById(adsHistory.adProviderId);
    if (ad) {
      ad.completionCount += 1;
      await ad.save();
    }

    // Update user wallet
    const user = await User.findById(userId);
    user.wallet.totalIncome += adsHistory.amountEarned;
    user.wallet.adsIncome += adsHistory.amountEarned;
    user.wallet.availableBalance += adsHistory.amountEarned;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Ad completed and wallet updated',
      amountEarned: adsHistory.amountEarned,
      wallet: user.wallet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get ads history
exports.getAdsHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    let query = { userId };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const adsHistory = await AdsHistory.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await AdsHistory.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      adsHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get available ads
exports.getAvailableAds = async (req, res) => {
  try {
    const { adType, page = 1, limit = 10 } = req.query;

    let query = { isActive: true };

    if (adType) {
      query.adType = adType;
    }

    const skip = (page - 1) * limit;

    const ads = await Ads.find(query)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ads.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      ads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create ad (admin only)
exports.createAd = async (req, res) => {
  try {
    const {
      title,
      description,
      adType,
      mediaUrl,
      vastUrl,
      redirectUrl,
      rewardAmount,
      dailyLimit,
    } = req.body;

    // if video ad, at least one source is required
    if (adType === 'video' && !mediaUrl && !vastUrl) {
      return res.status(400).json({
        success: false,
        message: 'Video ads must include either a mediaUrl or a vastUrl',
      });
    }

    const ad = new Ads({
      title,
      description,
      adType,
      mediaUrl,
      vastUrl,
      redirectUrl,
      rewardAmount,
      dailyLimit,
      createdBy: req.user.id,
    });

    await ad.save();

    res.status(201).json({
      success: true,
      message: 'Ad created successfully',
      ad,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update ad (admin only)
exports.updateAd = async (req, res) => {
  try {
    const { adId } = req.params;
    const {
      title,
      description,
      mediaUrl,
      vastUrl,
      redirectUrl,
      rewardAmount,
      isActive,
      dailyLimit,
    } = req.body;

    const updateFields = {
      ...(title && { title }),
      ...(description && { description }),
      ...(mediaUrl !== undefined && { mediaUrl }),
      ...(vastUrl !== undefined && { vastUrl }),
      ...(redirectUrl && { redirectUrl }),
      ...(rewardAmount && { rewardAmount }),
      ...(isActive !== undefined && { isActive }),
      ...(dailyLimit && { dailyLimit }),
    };

    const ad = await Ads.findByIdAndUpdate(adId, updateFields, { new: true });

    res.status(200).json({
      success: true,
      message: 'Ad updated successfully',
      ad,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete ad (admin only)
exports.deleteAd = async (req, res) => {
  try {
    const { adId } = req.params;

    await Ads.findByIdAndDelete(adId);

    res.status(200).json({
      success: true,
      message: 'Ad deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
