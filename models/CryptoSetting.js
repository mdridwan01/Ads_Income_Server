const mongoose = require('mongoose');

const cryptoSettingSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    perPage: {
      type: Number,
      default: 20,
      min: 1,
      max: 50,
    },
    vsCurrency: {
      type: String,
      enum: ['usd', 'eur', 'bdt'],
      default: 'usd',
    },
  },
  { timestamps: true }
);

// create singleton pattern: always use the first document
cryptoSettingSchema.statics.getSettings = async function () {
  let setting = await this.findOne();
  if (!setting) {
    setting = await this.create({});
  }
  return setting;
};

module.exports = mongoose.model('CryptoSetting', cryptoSettingSchema);
