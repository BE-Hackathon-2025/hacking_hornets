import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs,
  deleteDoc,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Create a new user document in Firestore
 * @param {string} userId - The user's Firebase Auth UID
 * @param {object} userData - User data (email, displayName, etc.)
 */
export const createUserDocument = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('User document created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

/**
 * Get user document from Firestore
 * @param {string} userId - The user's Firebase Auth UID
 */
export const getUserDocument = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, data: userSnap.data() };
    } else {
      return { success: false, message: 'User document not found' };
    }
  } catch (error) {
    console.error('Error getting user document:', error);
    throw error;
  }
};

/**
 * Update user document in Firestore
 * @param {string} userId - The user's Firebase Auth UID
 * @param {object} updates - Fields to update
 */
export const updateUserDocument = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('User document updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating user document:', error);
    throw error;
  }
};

/**
 * Initialize or get user cash balance
 * @param {string} userId - The user's Firebase Auth UID
 */
export const getUserCash = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      // If cashAvailable doesn't exist, initialize it to $15,000
      if (userData.cashAvailable === undefined) {
        await updateDoc(userRef, {
          cashAvailable: 15000,
          updatedAt: serverTimestamp()
        });
        return { success: true, cashAvailable: 15000 };
      }
      return { success: true, cashAvailable: userData.cashAvailable };
    } else {
      // Create user document with initial cash
      await setDoc(userRef, {
        cashAvailable: 15000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, cashAvailable: 15000 };
    }
  } catch (error) {
    console.error('Error getting user cash:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user cash balance
 * @param {string} userId - The user's Firebase Auth UID
 * @param {number} amount - Amount to add (positive) or subtract (negative)
 */
export const updateUserCash = async (userId, amount) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const currentCash = userSnap.data().cashAvailable || 0;
      const newCash = currentCash + amount;
      
      if (newCash < 0) {
        return { success: false, message: 'Insufficient funds' };
      }
      
      await updateDoc(userRef, {
        cashAvailable: newCash,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, cashAvailable: newCash };
    } else {
      return { success: false, message: 'User not found' };
    }
  } catch (error) {
    console.error('Error updating user cash:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// PORTFOLIO OPERATIONS
// ============================================

/**
 * Create a new portfolio for a user (stored as subcollection under user document)
 * @param {string} userId - The user's Firebase Auth UID
 * @param {object} portfolioData - Portfolio data (holdings, transactions, etc.)
 */
export const createPortfolio = async (userId, portfolioData) => {
  try {
    const portfolioRef = collection(db, 'users', userId, 'portfolios');
    const docRef = await addDoc(portfolioRef, {
      ...portfolioData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('Portfolio created with ID:', docRef.id);
    return { success: true, portfolioId: docRef.id };
  } catch (error) {
    console.error('Error creating portfolio:', error);
    throw error;
  }
};

/**
 * Get all portfolios for a user
 * @param {string} userId - The user's Firebase Auth UID
 */
export const getUserPortfolios = async (userId) => {
  try {
    const portfoliosRef = collection(db, 'users', userId, 'portfolios');
    const q = query(portfoliosRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const portfolios = [];
    querySnapshot.forEach((doc) => {
      portfolios.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: portfolios };
  } catch (error) {
    console.error('Error getting portfolios:', error);
    throw error;
  }
};

/**
 * Get a specific portfolio by ID
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} portfolioId - The portfolio document ID
 */
export const getPortfolio = async (userId, portfolioId) => {
  try {
    const portfolioRef = doc(db, 'users', userId, 'portfolios', portfolioId);
    const portfolioSnap = await getDoc(portfolioRef);
    
    if (portfolioSnap.exists()) {
      return { success: true, data: { id: portfolioSnap.id, ...portfolioSnap.data() } };
    } else {
      return { success: false, message: 'Portfolio not found' };
    }
  } catch (error) {
    console.error('Error getting portfolio:', error);
    throw error;
  }
};

/**
 * Update a portfolio
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} portfolioId - The portfolio document ID
 * @param {object} updates - Fields to update
 */
export const updatePortfolio = async (userId, portfolioId, updates) => {
  try {
    const portfolioRef = doc(db, 'users', userId, 'portfolios', portfolioId);
    await updateDoc(portfolioRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('Portfolio updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating portfolio:', error);
    throw error;
  }
};

/**
 * Delete a portfolio
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} portfolioId - The portfolio document ID
 */
export const deletePortfolio = async (userId, portfolioId) => {
  try {
    const portfolioRef = doc(db, 'users', userId, 'portfolios', portfolioId);
    await deleteDoc(portfolioRef);
    console.log('Portfolio deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    throw error;
  }
};

/**
 * Add a holding to a portfolio
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} portfolioId - The portfolio document ID
 * @param {object} holding - Holding data (symbol, shares, avgPrice, etc.)
 */
export const addHolding = async (userId, portfolioId, holding) => {
  try {
    const portfolioRef = doc(db, 'users', userId, 'portfolios', portfolioId);
    const portfolioSnap = await getDoc(portfolioRef);
    
    if (portfolioSnap.exists()) {
      const currentHoldings = portfolioSnap.data().holdings || [];
      await updateDoc(portfolioRef, {
        holdings: [...currentHoldings, holding],
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } else {
      return { success: false, message: 'Portfolio not found' };
    }
  } catch (error) {
    console.error('Error adding holding:', error);
    throw error;
  }
};

/**
 * Remove a holding from a portfolio
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} portfolioId - The portfolio document ID
 * @param {string} symbol - Stock symbol to remove
 */
export const removeHolding = async (userId, portfolioId, symbol) => {
  try {
    const portfolioRef = doc(db, 'users', userId, 'portfolios', portfolioId);
    const portfolioSnap = await getDoc(portfolioRef);
    
    if (portfolioSnap.exists()) {
      const currentHoldings = portfolioSnap.data().holdings || [];
      const updatedHoldings = currentHoldings.filter(h => h.symbol !== symbol);
      
      await updateDoc(portfolioRef, {
        holdings: updatedHoldings,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } else {
      return { success: false, message: 'Portfolio not found' };
    }
  } catch (error) {
    console.error('Error removing holding:', error);
    throw error;
  }
};

/**
 * Buy more shares of a stock (adds to existing holding or creates new one)
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} portfolioId - The portfolio document ID
 * @param {string} symbol - Stock symbol
 * @param {string} name - Stock name
 * @param {number} shares - Number of shares to buy
 * @param {number} price - Price per share
 */
export const buyShares = async (userId, portfolioId, symbol, name, shares, price) => {
  try {
    const totalCost = shares * price;
    
    // Check if user has enough cash
    const cashResult = await getUserCash(userId);
    if (!cashResult.success || cashResult.cashAvailable < totalCost) {
      return { success: false, message: 'Insufficient funds' };
    }
    
    // Deduct cash from user
    const updateCashResult = await updateUserCash(userId, -totalCost);
    if (!updateCashResult.success) {
      return { success: false, message: updateCashResult.message };
    }
    
    // Update portfolio holdings
    const portfolioRef = doc(db, 'users', userId, 'portfolios', portfolioId);
    const portfolioSnap = await getDoc(portfolioRef);
    
    if (!portfolioSnap.exists()) {
      return { success: false, message: 'Portfolio not found' };
    }
    
    const currentHoldings = portfolioSnap.data().holdings || [];
    const existingHoldingIndex = currentHoldings.findIndex(h => h.symbol === symbol);
    
    if (existingHoldingIndex >= 0) {
      // Add to existing holding
      currentHoldings[existingHoldingIndex].shares += shares;
    } else {
      // Create new holding
      currentHoldings.push({ symbol, name, shares });
    }
    
    await updateDoc(portfolioRef, {
      holdings: currentHoldings,
      updatedAt: serverTimestamp()
    });
    
    // Add transaction record
    const today = new Date().toISOString().split('T')[0];
    await addTransaction(userId, portfolioId, {
      date: today,
      type: 'BUY',
      symbol,
      shares,
      price
    });
    
    return { 
      success: true, 
      cashAvailable: updateCashResult.cashAvailable,
      totalCost 
    };
  } catch (error) {
    console.error('Error buying shares:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add a transaction to a portfolio
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} portfolioId - The portfolio document ID
 * @param {object} transaction - Transaction data (date, type, symbol, shares, price, etc.)
 */
export const addTransaction = async (userId, portfolioId, transaction) => {
  try {
    const portfolioRef = doc(db, 'users', userId, 'portfolios', portfolioId);
    const portfolioSnap = await getDoc(portfolioRef);
    
    if (portfolioSnap.exists()) {
      const currentTransactions = portfolioSnap.data().transactions || [];
      // Calculate total for the transaction
      const total = transaction.shares * transaction.price;
      
      await updateDoc(portfolioRef, {
        transactions: [...currentTransactions, { 
          ...transaction, 
          total,
          timestamp: Date.now() // Use Date.now() instead of serverTimestamp()
        }],
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } else {
      return { success: false, message: 'Portfolio not found' };
    }
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

// ============================================
// AI CONVERSATION OPERATIONS
// ============================================

/**
 * Create a new AI conversation (stored as subcollection under user document)
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} title - Conversation title
 */
export const createConversation = async (userId, title = 'New Conversation') => {
  try {
    const conversationRef = collection(db, 'users', userId, 'conversations');
    const docRef = await addDoc(conversationRef, {
      title,
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('Conversation created with ID:', docRef.id);
    return { success: true, conversationId: docRef.id };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 * @param {string} userId - The user's Firebase Auth UID
 */
export const getUserConversations = async (userId) => {
  try {
    const conversationsRef = collection(db, 'users', userId, 'conversations');
    const q = query(conversationsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const conversations = [];
    querySnapshot.forEach((doc) => {
      conversations.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: conversations };
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

/**
 * Get a specific conversation by ID
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} conversationId - The conversation document ID
 */
export const getConversation = async (userId, conversationId) => {
  try {
    const conversationRef = doc(db, 'users', userId, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      return { success: true, data: { id: conversationSnap.id, ...conversationSnap.data() } };
    } else {
      return { success: false, message: 'Conversation not found' };
    }
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
};

/**
 * Add a message to a conversation
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} conversationId - The conversation document ID
 * @param {object} message - Message data (role, content, timestamp)
 */
export const addMessage = async (userId, conversationId, message) => {
  try {
    const conversationRef = doc(db, 'users', userId, 'conversations', conversationId);
    
    // Use arrayUnion to append the message to the messages array
    await updateDoc(conversationRef, {
      messages: arrayUnion({ 
        ...message, 
        timestamp: new Date().toISOString()
      }),
      updatedAt: serverTimestamp()
    });
    
    console.log('Message added successfully to conversation:', conversationId);
    return { success: true };
  } catch (error) {
    console.error('Error adding message:', error);
    console.error('UserId:', userId, 'ConversationId:', conversationId);
    throw error;
  }
};

/**
 * Update conversation title
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} conversationId - The conversation document ID
 * @param {string} title - New title
 */
export const updateConversationTitle = async (userId, conversationId, title) => {
  try {
    const conversationRef = doc(db, 'users', userId, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      title,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating conversation title:', error);
    throw error;
  }
};

/**
 * Delete a conversation
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} conversationId - The conversation document ID
 */
export const deleteConversation = async (userId, conversationId) => {
  try {
    const conversationRef = doc(db, 'users', userId, 'conversations', conversationId);
    await deleteDoc(conversationRef);
    console.log('Conversation deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

// ============================================
// WATCHLIST OPERATIONS
// ============================================

/**
 * Get all watchlist items for a user
 * @param {string} userId - The user's Firebase Auth UID
 */
export const getUserWatchlist = async (userId) => {
  try {
    const watchlistRef = collection(db, 'users', userId, 'watchlist');
    const q = query(watchlistRef, orderBy('addedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const watchlist = [];
    querySnapshot.forEach((doc) => {
      watchlist.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: watchlist };
  } catch (error) {
    console.error('Error getting watchlist:', error);
    throw error;
  }
};

/**
 * Add a stock to the watchlist
 * @param {string} userId - The user's Firebase Auth UID
 * @param {object} stockData - Stock data (symbol, name, currentPrice, etc.)
 */
export const addToWatchlist = async (userId, stockData) => {
  try {
    const watchlistRef = collection(db, 'users', userId, 'watchlist');
    const docRef = await addDoc(watchlistRef, {
      ...stockData,
      addedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('Stock added to watchlist successfully');
    return { success: true, watchlistItemId: docRef.id };
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    throw error;
  }
};

/**
 * Remove a stock from the watchlist
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} watchlistItemId - The watchlist item document ID
 */
export const removeFromWatchlist = async (userId, watchlistItemId) => {
  try {
    const watchlistItemRef = doc(db, 'users', userId, 'watchlist', watchlistItemId);
    await deleteDoc(watchlistItemRef);
    console.log('Stock removed from watchlist successfully');
    return { success: true };
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw error;
  }
};

/**
 * Update a watchlist item (e.g., update current price)
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} watchlistItemId - The watchlist item document ID
 * @param {object} updates - Fields to update
 */
export const updateWatchlistItem = async (userId, watchlistItemId, updates) => {
  try {
    const watchlistItemRef = doc(db, 'users', userId, 'watchlist', watchlistItemId);
    await updateDoc(watchlistItemRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('Watchlist item updated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating watchlist item:', error);
    throw error;
  }
};

/**
 * Check if a stock is in the watchlist
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} symbol - Stock symbol to check
 */
export const isInWatchlist = async (userId, symbol) => {
  try {
    const watchlistRef = collection(db, 'users', userId, 'watchlist');
    const querySnapshot = await getDocs(watchlistRef);
    
    let found = false;
    querySnapshot.forEach((doc) => {
      if (doc.data().symbol === symbol) {
        found = true;
      }
    });
    
    return { success: true, isInWatchlist: found };
  } catch (error) {
    console.error('Error checking watchlist:', error);
    throw error;
  }
};

// ============================================
// STOCK PRICE CACHING
// ============================================

/**
 * Cache stock price data in Firestore
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} symbol - Stock symbol
 * @param {number} price - Current stock price
 * @param {object} additionalData - Optional additional data (historical prices, avgPrice, gain, etc.)
 */
export const cacheStockPrice = async (userId, symbol, price, additionalData = {}) => {
  try {
    const cacheRef = doc(db, 'users', userId, 'priceCache', symbol);
    await setDoc(cacheRef, {
      symbol,
      price,
      ...additionalData,
      lastUpdated: serverTimestamp(),
      timestamp: Date.now() // Client timestamp for immediate access
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error caching stock price:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get cached stock price from Firestore
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string} symbol - Stock symbol
 * @param {number} maxAgeMinutes - Maximum age of cached data in minutes (default: 5)
 * @returns {object} - Cached price data or null if expired/not found
 */
export const getCachedStockPrice = async (userId, symbol, maxAgeMinutes = 5, preferStaleMinutes = 0) => {
  try {
    const cacheRef = doc(db, 'users', userId, 'priceCache', symbol);
    const cacheSnap = await getDoc(cacheRef);
    
    if (cacheSnap.exists()) {
      const data = cacheSnap.data();
      const now = Date.now();
      const cacheAge = now - (data.timestamp || 0);
      const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
      const staleTime = preferStaleMinutes * 60 * 1000; // Minimum age to prefer
      
      // If cache is within valid range
      if (cacheAge < maxAge) {
        // If we prefer stale data and cache is fresh, mark it but still return it
        const isStale = cacheAge >= staleTime;
        return { 
          success: true, 
          data, 
          isCached: true,
          isStale, // true if cache is old enough to prefer
          cacheAgeMinutes: Math.floor(cacheAge / (60 * 1000))
        };
      } else {
        return { success: false, error: 'Cache expired', isCached: false };
      }
    }
    
    return { success: false, error: 'No cached data', isCached: false };
  } catch (error) {
    console.error('Error getting cached stock price:', error);
    return { success: false, error: error.message, isCached: false };
  }
};

/**
 * Get multiple cached stock prices at once
 * @param {string} userId - The user's Firebase Auth UID
 * @param {string[]} symbols - Array of stock symbols
 * @param {number} maxAgeMinutes - Maximum age of cached data in minutes (default: 5)
 * @param {number} preferStaleMinutes - Prefer cache that's at least this old (default: 0)
 * @returns {object} - Object with symbol keys and cached price data
 */
export const getCachedStockPrices = async (userId, symbols, maxAgeMinutes = 5, preferStaleMinutes = 0) => {
  try {
    const cachePromises = symbols.map(symbol => 
      getCachedStockPrice(userId, symbol, maxAgeMinutes, preferStaleMinutes)
    );
    const results = await Promise.all(cachePromises);
    
    const cachedPrices = {};
    symbols.forEach((symbol, index) => {
      if (results[index].success) {
        cachedPrices[symbol] = results[index].data;
      }
    });
    
    return { success: true, data: cachedPrices };
  } catch (error) {
    console.error('Error getting cached stock prices:', error);
    return { success: false, error: error.message, data: {} };
  }
};

/**
 * Batch cache multiple stock prices
 * @param {string} userId - The user's Firebase Auth UID
 * @param {object} pricesData - Object with symbol keys and price data values
 */
export const batchCacheStockPrices = async (userId, pricesData) => {
  try {
    const cachePromises = Object.entries(pricesData).map(([symbol, data]) =>
      cacheStockPrice(userId, symbol, data.price, data.additionalData || {})
    );
    await Promise.all(cachePromises);
    return { success: true };
  } catch (error) {
    console.error('Error batch caching stock prices:', error);
    return { success: false, error: error.message };
  }
};
