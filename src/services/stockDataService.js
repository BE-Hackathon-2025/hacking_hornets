/**
 * Stock Data Service - Handles fetching stock data with intelligent caching
 * Checks cache first, only fetches from API if cache is expired
 */

import { polygonRateLimiter } from './apiRateLimiter';
import { 
  getCachedStockPrice, 
  getCachedStockPrices, 
  cacheStockPrice,
  batchCacheStockPrices 
} from './firestoreService';

const API_KEY = import.meta.env.VITE_POLYGON_API_KEY;
const CACHE_DURATION_MINUTES = 5; // Cache stock prices for 5 minutes

/**
 * Fetch current stock price (with caching)
 * @param {string} userId - User ID for cache
 * @param {string} symbol - Stock symbol
 * @param {boolean} forceRefresh - Force API fetch even if cache exists
 * @returns {Promise<object>} - Stock price data
 */
export const getCurrentStockPrice = async (userId, symbol, forceRefresh = false) => {
  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedStockPrice(userId, symbol, CACHE_DURATION_MINUTES);
      if (cached.success) {
        console.log(`Using cached price for ${symbol}`);
        return { success: true, data: cached.data, fromCache: true };
      }
    }

    // Fetch from API using rate limiter
    console.log(`Fetching fresh price for ${symbol} from API`);
    const data = await polygonRateLimiter.enqueue(async () => {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${API_KEY}`
      );
      return response.json();
    });

    if (data.results && data.results.length > 0) {
      const price = data.results[0].c;
      
      // Cache the result
      await cacheStockPrice(userId, symbol, price, {
        open: data.results[0].o,
        high: data.results[0].h,
        low: data.results[0].l,
        volume: data.results[0].v
      });

      return { 
        success: true, 
        data: { 
          symbol, 
          price,
          open: data.results[0].o,
          high: data.results[0].h,
          low: data.results[0].l,
          volume: data.results[0].v,
          timestamp: Date.now()
        },
        fromCache: false 
      };
    }

    return { success: false, error: 'No data available', fromCache: false };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return { success: false, error: error.message, fromCache: false };
  }
};

/**
 * Fetch multiple stock prices (with caching)
 * @param {string} userId - User ID for cache
 * @param {string[]} symbols - Array of stock symbols
 * @param {boolean} forceRefresh - Force API fetch even if cache exists
 * @returns {Promise<object>} - Object with symbol keys and price data
 */
export const getCurrentStockPrices = async (userId, symbols, forceRefresh = false) => {
  try {
    const prices = {};
    const symbolsToFetch = [];

    // Check cache for all symbols first
    if (!forceRefresh) {
      const cachedResult = await getCachedStockPrices(userId, symbols, CACHE_DURATION_MINUTES);
      
      if (cachedResult.success) {
        // Add cached prices to result
        Object.entries(cachedResult.data).forEach(([symbol, data]) => {
          prices[symbol] = { ...data, fromCache: true };
          console.log(`Using cached price for ${symbol}`);
        });

        // Find symbols that need to be fetched
        symbols.forEach(symbol => {
          if (!prices[symbol]) {
            symbolsToFetch.push(symbol);
          }
        });
      } else {
        symbolsToFetch.push(...symbols);
      }
    } else {
      symbolsToFetch.push(...symbols);
    }

    // Fetch missing symbols from API
    if (symbolsToFetch.length > 0) {
      console.log(`Fetching ${symbolsToFetch.length} symbols from API:`, symbolsToFetch);
      
      const fetchPromises = symbolsToFetch.map(symbol => 
        getCurrentStockPrice(userId, symbol, true) // Force refresh for these
      );

      const results = await Promise.all(fetchPromises);
      
      results.forEach((result, index) => {
        if (result.success) {
          prices[symbolsToFetch[index]] = { ...result.data, fromCache: false };
        }
      });
    }

    return { success: true, data: prices };
  } catch (error) {
    console.error('Error fetching stock prices:', error);
    return { success: false, error: error.message, data: {} };
  }
};

/**
 * Fetch historical stock price for a specific date (with caching)
 * @param {string} userId - User ID for cache
 * @param {string} symbol - Stock symbol
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {boolean} forceRefresh - Force API fetch even if cache exists
 * @returns {Promise<object>} - Historical price data
 */
export const getHistoricalStockPrice = async (userId, symbol, date, forceRefresh = false) => {
  try {
    const cacheKey = `${symbol}-${date}`;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = await getCachedStockPrice(userId, cacheKey, CACHE_DURATION_MINUTES);
      if (cached.success) {
        console.log(`Using cached historical price for ${symbol} on ${date}`);
        return { success: true, data: cached.data, fromCache: true };
      }
    }

    // Fetch from API
    console.log(`Fetching historical price for ${symbol} on ${date}`);
    const data = await polygonRateLimiter.enqueue(async () => {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${date}/${date}?adjusted=true&apiKey=${API_KEY}`
      );
      return response.json();
    });

    if (data.results && data.results.length > 0) {
      const price = data.results[0].c;
      
      // Cache the result
      await cacheStockPrice(userId, cacheKey, price, {
        date,
        open: data.results[0].o,
        high: data.results[0].h,
        low: data.results[0].l,
        volume: data.results[0].v
      });

      return {
        success: true,
        data: {
          symbol,
          date,
          price,
          open: data.results[0].o,
          high: data.results[0].h,
          low: data.results[0].l,
          volume: data.results[0].v,
          timestamp: Date.now()
        },
        fromCache: false
      };
    }

    return { success: false, error: 'No data available', fromCache: false };
  } catch (error) {
    console.error(`Error fetching historical price for ${symbol} on ${date}:`, error);
    return { success: false, error: error.message, fromCache: false };
  }
};

/**
 * Fetch historical data range (with caching for individual days)
 * @param {string} userId - User ID for cache
 * @param {string} symbol - Stock symbol
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<object>} - Array of historical price data
 */
export const getHistoricalStockData = async (userId, symbol, startDate, endDate) => {
  try {
    console.log(`Fetching historical data for ${symbol} from ${startDate} to ${endDate}`);
    
    const data = await polygonRateLimiter.enqueue(async () => {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&apiKey=${API_KEY}`
      );
      return response.json();
    });

    if (data.results && data.results.length > 0) {
      // Cache each day's price for future use
      const cachePromises = data.results.map(result => {
        const date = new Date(result.t).toISOString().split('T')[0];
        const cacheKey = `${symbol}-${date}`;
        return cacheStockPrice(userId, cacheKey, result.c, {
          date,
          open: result.o,
          high: result.h,
          low: result.l,
          volume: result.v
        });
      });
      await Promise.all(cachePromises);

      return {
        success: true,
        data: {
          symbol,
          results: data.results.map(r => ({
            timestamp: r.t,
            date: new Date(r.t).toISOString().split('T')[0],
            open: r.o,
            high: r.h,
            low: r.l,
            close: r.c,
            volume: r.v
          }))
        }
      };
    }

    return { success: false, error: 'No data available' };
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return { success: false, error: error.message };
  }
};
