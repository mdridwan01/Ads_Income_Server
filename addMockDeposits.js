require('dotenv').config();
const mongoose = require('mongoose');
const Deposit = require('./models/Deposit');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    const user = await User.findOne();
    if (!user) {
      console.log('❌ No users found');
      process.exit(1);
    }

    const mockDeposits = [
      { 
        userId: user._id, 
        level_target: 2,
        amount: 1500, 
        network: 'TRC20', 
        wallet_address: 'system_wallet_123',
        tx_hash: 'tx_' + Date.now() + '_1',
        status: 'approved',
        created_at: new Date(Date.now() - 3600000)
      },
      { 
        userId: user._id, 
        level_target: 3,
        amount: 2500, 
        network: 'ERC20', 
        wallet_address: 'system_wallet_123',
        tx_hash: 'tx_' + Date.now() + '_2',
        status: 'approved',
        created_at: new Date(Date.now() - 7200000)
      },
      { 
        userId: user._id, 
        level_target: 4,
        amount: 5000, 
        network: 'TRC20', 
        wallet_address: 'system_wallet_123',
        tx_hash: 'tx_' + Date.now() + '_3',
        status: 'approved',
        created_at: new Date(Date.now() - 10800000)
      }
    ];

    const inserted = await Deposit.insertMany(mockDeposits);
    console.log('✅ Added', inserted.length, 'mock approved deposits');
    console.log('🔄 Refresh your browser to see them in the Live Deposits Feed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
