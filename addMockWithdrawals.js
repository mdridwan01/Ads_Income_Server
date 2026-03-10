require('dotenv').config();
const mongoose = require('mongoose');
const Withdraw = require('./models/Withdraw');
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

    const mockWithdrawals = [
      { 
        userId: user._id, 
        amount: 500, 
        withdrawalMethod: 'TRC20', 
        walletAddress: 'TXabc1234567890',
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000)
      },
      { 
        userId: user._id, 
        amount: 1000, 
        withdrawalMethod: 'ERC20', 
        walletAddress: '0xdeadbeef12345678',
        status: 'completed',
        createdAt: new Date(Date.now() - 7200000)
      },
      { 
        userId: user._id, 
        amount: 750, 
        withdrawalMethod: 'TRC20', 
        walletAddress: 'TX9876543210',
        status: 'completed',
        createdAt: new Date(Date.now() - 10800000)
      }
    ];

    const inserted = await Withdraw.insertMany(mockWithdrawals);
    console.log('✅ Added', inserted.length, 'mock completed withdrawals');
    console.log('🔄 Refresh your browser to see them in the Live Withdrawals Feed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
