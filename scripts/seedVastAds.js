/**
 * Seed demo VAST ads into the database
 * Run: node scripts/seedVastAds.js
 * 
 * This script creates demo video ads configured with VAST tags
 * for testing video ad networks like youradexchange.com
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Ads = require('../models/Ads');

// Demo VAST ads data
const demoVastAds = [
  {
    title: 'YouRadExchange - In-Stream VAST Ad #1',
    description:
      'In-stream video ad delivered via VAST protocol from YouRadExchange. This demonstrates integration with third-party ad networks.',
    adType: 'video',
    vastUrl: 'https://youradexchange.com/video/select.php?r=11002582',
    mediaUrl: '', // No direct media URL needed with VAST tags
    redirectUrl: 'https://youradexchange.com',
    rewardAmount: 15,
    dailyLimit: 50,
    provider: 'youradexchange',
    providerAdId: '11002582',
    isActive: true,
  },
  {
    title: 'YouRadExchange - In-Stream VAST Ad #2',
    description:
      'Another in-stream VAST video ad example for network testing and revenue verification.',
    adType: 'video',
    vastUrl: 'https://youradexchange.com/video/select.php?r=11002662',
    mediaUrl: '',
    redirectUrl: 'https://youradexchange.com',
    rewardAmount: 12,
    dailyLimit: 100,
    provider: 'youradexchange',
    providerAdId: '11002662',
    isActive: true,
  },
  {
    title: 'Google IMA VAST Tag (Demo)',
    description:
      'Demo VAST tag using Google DoubleClick for flexible ad management and reporting.',
    adType: 'video',
    vastUrl:
      'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/example/video/single/preroll&ciu_szs=560x315,640x480&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Dgmf-js&cmsid=496&vid=short_onecm_article&correlator=',
    mediaUrl: '',
    redirectUrl: 'https://google.com',
    rewardAmount: 10,
    dailyLimit: 75,
    provider: 'google-ima',
    providerAdId: 'demo-google-vast',
    isActive: true,
  },
  {
    title: 'Hybrid Mode - Content + VAST Ads',
    description:
      'Demonstration of hybrid mode: plays a direct video file with a VAST ad tag overlay. Good for in-stream monetization scenarios.',
    adType: 'video',
    mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Sample video
    vastUrl: 'https://youradexchange.com/video/select.php?r=11002582',
    redirectUrl: 'https://youradexchange.com',
    rewardAmount: 20,
    dailyLimit: 25,
    provider: 'hybrid-content-vast',
    providerAdId: 'hybrid-11002582',
    isActive: true,
  },
];

/**
 * Connect to MongoDB and seed ads
 */
async function seedAds() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cpa-marketing';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if demo ads already exist (avoid duplicates)
    const existingAds = await Ads.find({
      provider: { $in: ['youradexchange', 'google-ima', 'hybrid-content-vast'] },
    });

    if (existingAds.length > 0) {
      console.log(`⚠️  Found ${existingAds.length} existing demo ads. Skipping insertion to avoid duplicates.`);
      console.log('   To refresh demo ads, delete them first or modify this script.');
    } else {
      // Insert demo ads
      const result = await Ads.insertMany(demoVastAds);
      console.log(`✅ Successfully inserted ${result.length} demo VAST ads:`);
      result.forEach((ad, index) => {
        console.log(`   ${index + 1}. "${ad.title}"`);
        if (ad.vastUrl) console.log(`      VAST: ${ad.vastUrl.substring(0, 60)}...`);
        if (ad.mediaUrl) console.log(`      Media: ${ad.mediaUrl.substring(0, 60)}...`);
        console.log(`      Reward: ${ad.rewardAmount} TK | Daily Limit: ${ad.dailyLimit}`);
      });
    }

    // Display summary
    const totalAds = await Ads.countDocuments();
    console.log(`\n📊 Total ads in database: ${totalAds}`);

    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
  } catch (error) {
    console.error('❌ Error seeding ads:', error.message);
    process.exit(1);
  }
}

// Run the seed function
seedAds();
