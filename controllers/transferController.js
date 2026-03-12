const User = require('../models/User');
const Transfer = require('../models/Transfer');

// Transfer balance from sender to receiver (P2P)
exports.transferBalance = async (req, res) => {
  try {
    // allow receiver identified by username OR uid
    const { receiverUsername, receiverUid, amount } = req.body;
    const senderId = req.user.id;

    // Validate input
    if ((!receiverUsername && !receiverUid) || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid input - receiver and amount required' });
    }

    // Find sender
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({ success: false, message: 'Sender not found' });
    }

    // Check if sender has completed level 5
    if (sender.level < 5) {
      return res.status(403).json({ success: false, message: 'You must complete level 5 to perform P2P transfers' });
    }

    // Check sender balance
    if (sender.wallet.availableBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Find receiver by username or uid
    let receiver = null;
    if (receiverUid) {
      receiver = await User.findOne({ uid: receiverUid });
    }
    if (!receiver && receiverUsername) {
      receiver = await User.findOne({ username: receiverUsername });
    }
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    // Prevent self-transfer
    if (senderId === receiver._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to yourself' });
    }

    // Perform transfer
    sender.wallet.availableBalance -= amount;
    receiver.wallet.availableBalance += amount;

    // Generate transaction ID
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // Save users
    await sender.save();
    await receiver.save();

    // Log transfer
    const transfer = new Transfer({
      senderId,
      receiverId: receiver._id,
      amount,
      transactionId,
      processedDetails: {
        ipAddress: req.ip,
        deviceInfo: req.get('User-Agent'),
        processedAt: new Date(),
      },
    });
    await transfer.save();

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      transactionId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get transfer history for user
exports.getTransferHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const transfers = await Transfer.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate('senderId', 'username uid')
      .populate('receiverId', 'username uid')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, transfers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};