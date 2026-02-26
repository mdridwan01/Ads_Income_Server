const axios = require('axios');
const NodeCache = require('node-cache');
const CryptoSetting = require('../models/CryptoSetting');

// cache for 60 seconds
const cache = new NodeCache({ stdTTL: 60, checkperiod: 65 });

async function fetchRates(vs_currency = 'usd', per_page = 20) {
  const cacheKey = `rates_${vs_currency}_${per_page}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const url = 'https://api.coingecko.com/api/v3/coins/markets';
  try {
    const resp = await axios.get(url, {
      params: {
        vs_currency,
        order: 'market_cap_desc',
        per_page,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
      timeout: 10000,
    });

    const filtered = resp.data.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      current_price: coin.current_price,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      image: coin.image,
    }));

    cache.set(cacheKey, filtered);
    return filtered;
  } catch (error) {
    throw new Error('Failed to fetch crypto rates');
  }
}

async function getRatesWithSettings() {
  const settings = await CryptoSetting.getSettings();
  if (!settings.enabled) {
    const err = new Error('Crypto rates disabled by admin');
    err.status = 403;
    throw err;
  }
  return await fetchRates(settings.vsCurrency, settings.perPage);
}

module.exports = { fetchRates, getRatesWithSettings };
