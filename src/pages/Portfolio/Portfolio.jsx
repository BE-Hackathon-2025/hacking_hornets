import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentStockPrices, getHistoricalStockPrice } from '../../services/stockDataService';
import { cacheStockPrice } from '../../services/firestoreService';
import { 
  getUserPortfolios, 
  createPortfolio, 
  updatePortfolio,
  addHolding,
  addTransaction,
  removeHolding,
  getUserCash,
  buyShares as buySharesService
} from '../../services/firestoreService';
import toast from 'react-hot-toast';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import CardDataStats from '../../components/CardDataStats';
import AuthPrompt from '../../components/AuthPrompt';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "../../firebase/config";

const Portfolio = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('holdings');
  const [portfolios, setPortfolios] = useState([]);
  const [currentPortfolio, setCurrentPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [stockPrices, setStockPrices] = useState({});
  const [historicalPrices, setHistoricalPrices] = useState({});
  const [cashAvailable, setCashAvailable] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [sharesToBuy, setSharesToBuy] = useState('');
  const [sharesToSell, setSharesToSell] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockShares, setNewStockShares] = useState('');

  const [user, isloading] = useAuthState(auth);

  if (isloading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-boxdark-2">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPrompt />;
  }

  // Fetch portfolios on component mount
  useEffect(() => {
    if (currentUser) {
      fetchPortfolios();
      fetchCash();
    }
  }, [currentUser]);

  // Fetch stock prices when portfolio changes
  useEffect(() => {
    if (currentPortfolio && currentPortfolio.holdings) {
      // Always use cache first on initial load (never force API fetch)
      fetchStockPrices(false);
      
      // Set up background refresh after 2 minutes (only if cache was stale)
      const refreshTimer = setTimeout(() => {
        console.log('Background refresh: Updating stock prices after 2 minutes');
        fetchStockPrices(true); // Force refresh in background
      }, 120000); // 120 seconds (2 minutes)
      
      return () => clearTimeout(refreshTimer);
    }
  }, [currentPortfolio]);

  // Fetch user's cash balance
  const fetchCash = async () => {
    try {
      const result = await getUserCash(currentUser.uid);
      if (result.success) {
        setCashAvailable(result.cashAvailable);
      }
    } catch (error) {
      console.error('Error fetching cash:', error);
    }
  };

  // Fetch real-time stock prices from Polygon API (with caching)
  const fetchStockPrices = async (forceRefresh = false) => {
    try {
      const symbols = currentPortfolio.holdings.map(h => h.symbol);
      const transactions = currentPortfolio.transactions || [];

      // Fetch historical prices for transaction dates FIRST (with caching)
      const historicalPromises = transactions.map(async (transaction) => {
        const result = await getHistoricalStockPrice(
          currentUser.uid,
          transaction.symbol,
          transaction.date,
          forceRefresh
        );
        
        if (result.success) {
          return {
            key: `${transaction.symbol}-${transaction.date}`,
            price: result.data.price
          };
        }
        return {
          key: `${transaction.symbol}-${transaction.date}`,
          price: transaction.price // Fallback to stored price
        };
      });

      const historicalResults = await Promise.all(historicalPromises);
      
      const histPrices = {};
      historicalResults.forEach(({ key, price }) => {
        histPrices[key] = price;
      });
      setHistoricalPrices(histPrices);

      // Then fetch current prices (cache first, then API if needed)
      const currentPricesResult = await getCurrentStockPrices(currentUser.uid, symbols, forceRefresh);
      
      if (currentPricesResult.success) {
        const prices = {};
        Object.entries(currentPricesResult.data).forEach(([symbol, data]) => {
          prices[symbol] = data.price;
        });
        setStockPrices(prices);

        // Calculate and cache gain/loss for each holding ONLY when we have both prices
        const holdings = currentPortfolio.holdings || [];
        
        // Use Promise.all to cache all holdings in parallel (much faster)
        await Promise.all(holdings.map(async (holding) => {
          // Calculate average price from transactions using the fetched historical prices
          const symbolTransactions = transactions.filter(t => t.symbol === holding.symbol);
          let totalCost = 0;
          let totalShares = 0;
          
          symbolTransactions.forEach(t => {
            if (t.type === 'BUY') {
              const key = `${t.symbol}-${t.date}`;
              const price = histPrices[key] || t.price;
              totalCost += t.shares * price;
              totalShares += t.shares;
            }
          });
          
          const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
          const currentPrice = prices[holding.symbol] || 0;
          const value = holding.shares * currentPrice;
          const cost = holding.shares * avgPrice;
          const gain = value - cost;
          const gainPercent = cost > 0 ? ((gain / cost) * 100) : 0;

          // Cache the holding data with calculated values - use a composite key
          return cacheStockPrice(currentUser.uid, `holding-${holding.symbol}`, currentPrice, {
            symbol: holding.symbol,
            shares: holding.shares,
            avgPrice: parseFloat(avgPrice.toFixed(2)),
            currentPrice: parseFloat(currentPrice.toFixed(2)),
            value: parseFloat(value.toFixed(2)),
            cost: parseFloat(cost.toFixed(2)),
            gain: parseFloat(gain.toFixed(2)),
            gainPercent: parseFloat(gainPercent.toFixed(2)),
            calculatedAt: Date.now()
          });
        }));
      }
    } catch (error) {
      console.error('Error fetching stock prices:', error);
    }
  };

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const result = await getUserPortfolios(currentUser.uid);
      if (result.success && result.data.length > 0) {
        setPortfolios(result.data);
        setCurrentPortfolio(result.data[0]); // Set first portfolio as current
      }
      // Removed automatic portfolio initialization - users start with empty portfolio
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      toast.error('Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };

  const initializePortfolio = async () => {
    // Prevent duplicate initialization
    if (isInitializing) {
      console.log('Portfolio initialization already in progress, skipping...');
      return;
    }
    
    try {
      setIsInitializing(true);
      console.log('Starting portfolio initialization...');
      
      // Double-check if a portfolio was created while we were waiting
      const checkResult = await getUserPortfolios(currentUser.uid);
      if (checkResult.success && checkResult.data.length > 0) {
        console.log('Portfolio already exists, skipping initialization');
        setPortfolios(checkResult.data);
        setCurrentPortfolio(checkResult.data[0]);
        return;
      }
      
      const initialData = {
        name: 'Main Portfolio',
        holdings: [
          { symbol: 'AAPL', name: 'Apple Inc.', shares: 50 },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25 },
          { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 40 },
          { symbol: 'TSLA', name: 'Tesla Inc.', shares: 15 },
          { symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 30 },
        ],
        transactions: [
          { date: '2025-11-05', type: 'BUY', symbol: 'AAPL', shares: 10, price: 178.25, total: 1782.50 },
          { date: '2025-11-03', type: 'SELL', symbol: 'TSLA', shares: 5, price: 242.84, total: 1214.20 },
          { date: '2025-10-28', type: 'BUY', symbol: 'MSFT', shares: 15, price: 378.91, total: 5683.65 },
          { date: '2025-10-25', type: 'BUY', symbol: 'GOOGL', shares: 10, price: 142.80, total: 1428.00 },
        ]
      };
      
      const result = await createPortfolio(currentUser.uid, initialData);
      if (result.success) {
        console.log('Portfolio created successfully');
        await fetchPortfolios();
        toast.success('Portfolio initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing portfolio:', error);
      toast.error('Failed to initialize portfolio');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRemoveHolding = async (symbol) => {
    if (!window.confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) {
      return;
    }

    try {
      const result = await removeHolding(currentUser.uid, currentPortfolio.id, symbol);
      if (result.success) {
        toast.success(`${symbol} removed from portfolio`);
        // Reload portfolios to update the UI
        await fetchPortfolios();
      } else {
        toast.error('Failed to remove holding');
      }
    } catch (error) {
      console.error('Error removing holding:', error);
      toast.error('Failed to remove holding');
    }
  };

  const handleBuyMoreShares = (holding) => {
    setSelectedStock(holding);
    setSharesToBuy('');
    setShowBuyModal(true);
  };

  const handleSellShares = (holding) => {
    setSelectedStock(holding);
    setSharesToSell('');
    setSellPrice(stockPrices[holding.symbol]?.toFixed(2) || '');
    setShowSellModal(true);
  };

  const handleConfirmBuy = async () => {
    const shares = parseInt(sharesToBuy);
    if (isNaN(shares) || shares <= 0) {
      toast.error('Please enter a valid number of shares');
      return;
    }

    const currentPrice = stockPrices[selectedStock.symbol];
    if (!currentPrice) {
      toast.error('Unable to fetch current stock price');
      return;
    }

    const totalCost = shares * currentPrice;
    if (totalCost > cashAvailable) {
      toast.error(`Insufficient funds. You need $${totalCost.toFixed(2)} but have $${cashAvailable.toFixed(2)}`);
      return;
    }

    try {
      const result = await buySharesService(
        currentUser.uid,
        currentPortfolio.id,
        selectedStock.symbol,
        selectedStock.name,
        shares,
        currentPrice
      );

      if (result.success) {
        toast.success(`Bought ${shares} shares of ${selectedStock.symbol} for $${totalCost.toFixed(2)}`);
        setCashAvailable(result.cashAvailable);
        setShowBuyModal(false);
        await fetchPortfolios();
      } else {
        toast.error(result.message || 'Failed to buy shares');
      }
    } catch (error) {
      console.error('Error buying shares:', error);
      toast.error('Failed to buy shares');
    }
  };

  const handleConfirmSell = async () => {
    const shares = parseInt(sharesToSell);
    const price = parseFloat(sellPrice);
    
    if (isNaN(shares) || shares <= 0) {
      toast.error('Please enter a valid number of shares');
      return;
    }

    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid sell price');
      return;
    }

    if (shares > selectedStock.shares) {
      toast.error(`You only have ${selectedStock.shares} shares of ${selectedStock.symbol}`);
      return;
    }

    try {
      const totalProceeds = shares * price;
      const today = new Date().toISOString().split('T')[0];

      // Add SELL transaction
      await addTransaction(currentUser.uid, currentPortfolio.id, {
        symbol: selectedStock.symbol,
        shares: shares,
        price: price,
        type: 'SELL',
        date: today
      });

      // Update cash
      const newCash = cashAvailable + totalProceeds;
      const cashResult = await getUserCash(currentUser.uid);
      if (cashResult.success) {
        await updatePortfolio(currentUser.uid, currentPortfolio.id, {
          lastUpdated: Date.now()
        });
      }

      // Update holdings
      const newShareCount = selectedStock.shares - shares;
      if (newShareCount === 0) {
        // Remove holding completely
        await removeHolding(currentUser.uid, currentPortfolio.id, selectedStock.symbol);
      } else {
        // Update holding with new share count
        const updatedHoldings = currentPortfolio.holdings.map(h => 
          h.symbol === selectedStock.symbol 
            ? { ...h, shares: newShareCount }
            : h
        );
        await updatePortfolio(currentUser.uid, currentPortfolio.id, {
          holdings: updatedHoldings,
          lastUpdated: Date.now()
        });
      }

      toast.success(`Sold ${shares} shares of ${selectedStock.symbol} for $${totalProceeds.toFixed(2)}`);
      setCashAvailable(newCash);
      setShowSellModal(false);
      await fetchPortfolios();
    } catch (error) {
      console.error('Error selling shares:', error);
      toast.error('Failed to sell shares');
    }
  };

  const handleAddNewStock = async () => {
    const symbol = newStockSymbol.trim().toUpperCase();
    const shares = parseInt(newStockShares);

    if (!symbol) {
      toast.error('Please enter a stock symbol');
      return;
    }

    if (isNaN(shares) || shares <= 0) {
      toast.error('Please enter a valid number of shares');
      return;
    }

    try {
      // Fetch current price for the new stock
      const priceResult = await getCurrentStockPrices(currentUser.uid, [symbol]);
      if (!priceResult.success || !priceResult.data[symbol]) {
        toast.error('Unable to fetch stock price. Please verify the symbol.');
        return;
      }

      const currentPrice = priceResult.data[symbol].price;
      const totalCost = shares * currentPrice;

      if (totalCost > cashAvailable) {
        toast.error(`Insufficient funds. You need $${totalCost.toFixed(2)} but have $${cashAvailable.toFixed(2)}`);
        return;
      }

      const result = await buySharesService(
        currentUser.uid,
        currentPortfolio.id,
        symbol,
        symbol, // Use symbol as name for now
        shares,
        currentPrice
      );

      if (result.success) {
        toast.success(`Added ${shares} shares of ${symbol} for $${totalCost.toFixed(2)}`);
        setCashAvailable(result.cashAvailable);
        setShowAddStockModal(false);
        setNewStockSymbol('');
        setNewStockShares('');
        await fetchPortfolios();
      } else {
        toast.error(result.message || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Failed to add stock');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentPortfolio) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-xl mb-4">No portfolio found</p>
          <button 
            onClick={initializePortfolio}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90"
          >
            Create Portfolio
          </button>
        </div>
      </div>
    );
  }

  const holdings = currentPortfolio.holdings || [];
  const transactions = currentPortfolio.transactions || [];

  // Helper function to calculate average price and cost basis from transactions
  const calculateCostBasis = (symbol) => {
    const symbolTransactions = transactions.filter(t => t.symbol === symbol);
    if (symbolTransactions.length === 0) return { avgPrice: 0, totalCost: 0, totalShares: 0 };
    
    let totalCost = 0;
    let totalShares = 0;
    
    symbolTransactions.forEach(t => {
      if (t.type === 'BUY') {
        const key = `${t.symbol}-${t.date}`;
        const price = historicalPrices[key] || t.price; // Use API price or fallback to stored price
        totalCost += t.shares * price;
        totalShares += t.shares;
      } else if (t.type === 'SELL') {
        // For sells, reduce shares but maintain cost basis proportion
        totalShares -= t.shares;
      }
    });
    
    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
    return { avgPrice, totalCost, totalShares };
  };

  // Get current price from fetched stock prices
  const getCurrentPrice = (symbol) => {
    return stockPrices[symbol] || 0;
  };

  // Calculate enriched holdings with dynamic values
  const enrichedHoldings = holdings.map(holding => {
    const { avgPrice, totalCost } = calculateCostBasis(holding.symbol);
    const currentPrice = getCurrentPrice(holding.symbol);
    const value = holding.shares * currentPrice;
    
    // Cost should be based on current shares at average price
    const cost = holding.shares * avgPrice;
    const gain = value - cost;
    const gainPercent = cost > 0 ? ((gain / cost) * 100).toFixed(2) : '0.00';
    
    return {
      ...holding,
      avgPrice,
      currentPrice,
      value,
      cost,
      gain,
      gainPercent
    };
  });

  const totalValue = enrichedHoldings.reduce((sum, holding) => sum + holding.value, 0);
  const totalCost = enrichedHoldings.reduce((sum, holding) => sum + holding.cost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? ((totalGain / totalCost) * 100).toFixed(2) : '0.00';

  return (
    <>
      <Breadcrumb pageName="Portfolio" />

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        <CardDataStats 
          title="Total Portfolio Value" 
          total={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          rate={`${totalGainPercent}%`} 
          levelUp={totalGain >= 0}
          levelDown={totalGain < 0}
        >
          <svg
            className="fill-primary dark:fill-white"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17 6H15V4C15 2.9 14.1 2 13 2H11C9.9 2 9 2.9 9 4V6H7C5.9 6 5 6.9 5 8V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V8C19 6.9 18.1 6 17 6ZM11 4H13V6H11V4ZM17 19H7V8H17V19Z"
              fill=""
            />
            <path
              d="M12 10C10.9 10 10 10.9 10 12V14C10 15.1 10.9 16 12 16C13.1 16 14 15.1 14 14V12C14 10.9 13.1 10 12 10Z"
              fill=""
            />
          </svg>
        </CardDataStats>

        <CardDataStats 
          title="Total Gain/Loss" 
          total={`$${Math.abs(totalGain).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          rate={`${totalGainPercent}%`} 
          levelUp={totalGain >= 0}
          levelDown={totalGain < 0}
        >
          <svg
            className="fill-primary dark:fill-white"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z"
              fill=""
            />
          </svg>
        </CardDataStats>

        <CardDataStats 
          title="Number of Holdings" 
          total={holdings.length.toString()} 
          rate="Active" 
          levelUp
        >
          <svg
            className="fill-primary dark:fill-white"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 13H11V3H3V13ZM5 5H9V11H5V5Z"
              fill=""
            />
            <path
              d="M13 3V13H21V3H13ZM19 11H15V5H19V11Z"
              fill=""
            />
            <path
              d="M3 21H11V14H3V21ZM5 16H9V19H5V16Z"
              fill=""
            />
            <path
              d="M18 21C19.66 21 21 19.66 21 18C21 16.34 19.66 15 18 15C16.34 15 15 16.34 15 18C15 19.66 16.34 21 18 21ZM18 17C18.55 17 19 17.45 19 18C19 18.55 18.55 19 18 19C17.45 19 17 18.55 17 18C17 17.45 17.45 17 18 17Z"
              fill=""
            />
          </svg>
        </CardDataStats>

        <CardDataStats 
          title="Cash Available" 
          total={`$${cashAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          rate="Ready to invest" 
          levelUp
        >
          <svg
            className="fill-primary dark:fill-white"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z"
              fill=""
            />
          </svg>
        </CardDataStats>
      </div>

      {/* Tabs Navigation */}
      <div className="mt-4 md:mt-6 2xl:mt-7.5">
        <div className="mb-6 flex flex-wrap gap-5 border-b border-stroke dark:border-strokedark">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`inline-flex items-center justify-center rounded-t-lg border-b-2 py-4 px-5 text-sm font-medium ${
              activeTab === 'holdings'
                ? 'border-primary text-primary'
                : 'border-transparent text-body hover:text-primary dark:text-bodydark'
            }`}
          >
            <svg
              className="fill-current mr-2"
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 6H15V3C15 2.44772 14.5523 2 14 2H6C5.44772 2 5 2.44772 5 3V6H3C2.44772 6 2 6.44772 2 7V16C2 16.5523 2.44772 17 3 17H17C17.5523 17 18 16.5523 18 16V7C18 6.44772 17.5523 6 17 6ZM7 4H13V6H7V4ZM16 15H4V8H16V15Z"
                fill=""
              />
              <path
                d="M10 10C9.44772 10 9 10.4477 9 11V12C9 12.5523 9.44772 13 10 13C10.5523 13 11 12.5523 11 12V11C11 10.4477 10.5523 10 10 10Z"
                fill=""
              />
            </svg>
            Holdings
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`inline-flex items-center justify-center rounded-t-lg border-b-2 py-4 px-5 text-sm font-medium ${
              activeTab === 'transactions'
                ? 'border-primary text-primary'
                : 'border-transparent text-body hover:text-primary dark:text-bodydark'
            }`}
          >
            <svg
              className="fill-current mr-2"
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 3C2.44772 3 2 3.44772 2 4V16C2 16.5523 2.44772 17 3 17H17C17.5523 17 18 16.5523 18 16V4C18 3.44772 17.5523 3 17 3H3ZM4 5H16V15H4V5Z"
                fill=""
              />
              <path
                d="M6 7H14V8.5H6V7Z"
                fill=""
              />
              <path
                d="M6 10H11V11.5H6V10Z"
                fill=""
              />
              <path
                d="M13 10L15 11.5L13 13V10Z"
                fill=""
              />
            </svg>
            Transactions
          </button>
        </div>

        {/* Holdings Table */}
        {activeTab === 'holdings' && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="py-6 px-4 md:px-6 xl:px-7.5 flex justify-between items-center">
              <h4 className="text-xl font-semibold text-black dark:text-white">
                Current Holdings
              </h4>
              <button
                onClick={() => setShowAddStockModal(true)}
                className="inline-flex items-center justify-center rounded-md bg-primary py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-6 xl:px-8"
              >
                <svg
                  className="fill-current mr-2"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.1999 9.30001H9.69989V15.8C9.69989 16.1656 9.41864 16.45 9.05302 16.45C8.68739 16.45 8.40614 16.1687 8.40614 15.8V9.30001H1.89989C1.53427 9.30001 1.24989 9.01876 1.24989 8.65313C1.24989 8.28751 1.53114 8.00626 1.89989 8.00626H8.40614V1.50001C8.40614 1.13438 8.68739 0.853134 9.05302 0.853134C9.41864 0.853134 9.69989 1.13438 9.69989 1.50001V8.00626H16.1999C16.5655 8.00626 16.8499 8.28751 16.8499 8.65313C16.8499 9.01876 16.5655 9.30001 16.1999 9.30001Z"
                    fill=""
                  />
                </svg>
                Add Stock
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                      Symbol
                    </th>
                    <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                      Company Name
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Shares
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Cost Basis
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Current Price
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Total Value
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Gain/Loss
                    </th>
                    <th className="py-4 px-4 font-medium text-black dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedHoldings.map((holding, index) => (
                    <tr key={index}>
                      <td className="border-b border-[#eee] py-5 px-4 pl-9 dark:border-strokedark xl:pl-11">
                        <h5 className="font-bold text-black dark:text-white">
                          {holding.symbol}
                        </h5>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white">
                          {holding.name}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white">
                          {holding.shares}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white">
                          {holding.avgPrice > 0 ? `$${holding.avgPrice.toFixed(2)}` : 'N/A'}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white">
                          {holding.currentPrice > 0 ? `$${holding.currentPrice.toFixed(2)}` : 'Loading...'}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white font-semibold">
                          {holding.currentPrice > 0 ? `$${holding.value.toFixed(2)}` : 'Loading...'}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        {holding.currentPrice > 0 ? (
                          <p className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${
                            holding.gain >= 0
                              ? 'bg-success text-success'
                              : 'bg-danger text-danger'
                          }`}>
                            {holding.gain >= 0 ? '+' : ''}${Math.abs(holding.gain).toFixed(2)} ({holding.gainPercent}%)
                          </p>
                        ) : (
                          <p className="text-black dark:text-white text-sm">Loading...</p>
                        )}
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                          <div className="flex items-center space-x-3.5">
                            <button 
                              className="hover:text-success"
                              onClick={() => handleSellShares(holding)}
                              title={`Sell ${holding.symbol}`}
                            >
                              <svg
                                className="fill-current"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z"
                                  fill=""
                                />
                              </svg>
                            </button>
                            <button 
                              className="hover:text-primary"
                              onClick={() => handleBuyMoreShares(holding)}
                              title={`Buy more ${holding.symbol}`}
                            >
                              <svg
                                className="fill-current"
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M16.1999 9.30001H9.69989V15.8C9.69989 16.1656 9.41864 16.45 9.05302 16.45C8.68739 16.45 8.40614 16.1687 8.40614 15.8V9.30001H1.89989C1.53427 9.30001 1.24989 9.01876 1.24989 8.65313C1.24989 8.28751 1.53114 8.00626 1.89989 8.00626H8.40614V1.50001C8.40614 1.13438 8.68739 0.853134 9.05302 0.853134C9.41864 0.853134 9.69989 1.13438 9.69989 1.50001V8.00626H16.1999C16.5655 8.00626 16.8499 8.28751 16.8499 8.65313C16.8499 9.01876 16.5655 9.30001 16.1999 9.30001Z"
                                  fill=""
                                />
                              </svg>
                            </button>
                            <button 
                              className="hover:text-danger"
                              onClick={() => handleRemoveHolding(holding.symbol)}
                              title={`Remove ${holding.symbol} from portfolio`}
                            >
                              <svg
                                className="fill-current"
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2719H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z"
                                  fill=""
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {activeTab === 'transactions' && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="py-6 px-4 md:px-6 xl:px-7.5">
              <h4 className="text-xl font-semibold text-black dark:text-white">
                Recent Transactions
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                      Date
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Type
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Symbol
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Shares
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Price
                    </th>
                    <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr key={index}>
                      <td className="border-b border-[#eee] py-5 px-4 pl-9 dark:border-strokedark xl:pl-11">
                        <p className="text-black dark:text-white">
                          {transaction.date}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${
                          transaction.type === 'BUY'
                            ? 'bg-success text-success'
                            : 'bg-warning text-warning'
                        }`}>
                          {transaction.type}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white font-semibold">
                          {transaction.symbol}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white">
                          {transaction.shares}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white">
                          ${transaction.price.toFixed(2)}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                        <p className="text-black dark:text-white font-semibold">
                          ${transaction.total.toFixed(2)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Buy More Shares Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-boxdark">
            <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Buy More Shares of {selectedStock?.symbol}
            </h3>
            <p className="mb-4 text-sm text-body">
              Current Price: ${stockPrices[selectedStock?.symbol]?.toFixed(2) || 'Loading...'}
            </p>
            <p className="mb-4 text-sm text-body">
              Cash Available: ${cashAvailable.toFixed(2)}
            </p>
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Number of Shares
              </label>
              <input
                type="number"
                value={sharesToBuy}
                onChange={(e) => setSharesToBuy(e.target.value)}
                placeholder="Enter number of shares"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
              {sharesToBuy && stockPrices[selectedStock?.symbol] && (
                <p className="mt-2 text-sm text-body">
                  Total Cost: ${(parseInt(sharesToBuy) * stockPrices[selectedStock?.symbol]).toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowBuyModal(false)}
                className="rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuy}
                className="rounded bg-primary py-2 px-6 font-medium text-white hover:bg-opacity-90"
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Shares Modal */}
      {showSellModal && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-boxdark">
            <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Sell Shares of {selectedStock?.symbol}
            </h3>
            <p className="mb-4 text-sm text-body">
              Current Price: ${stockPrices[selectedStock?.symbol]?.toFixed(2) || 'Loading...'}
            </p>
            <p className="mb-4 text-sm text-body">
              Shares Available: {selectedStock?.shares}
            </p>
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Number of Shares to Sell
              </label>
              <input
                type="number"
                value={sharesToSell}
                onChange={(e) => setSharesToSell(e.target.value)}
                placeholder="Enter number of shares"
                max={selectedStock?.shares}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Sell Price per Share
              </label>
              <input
                type="number"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="Enter sell price"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
              {sharesToSell && sellPrice && (
                <p className="mt-2 text-sm text-success">
                  Total Proceeds: ${(parseInt(sharesToSell) * parseFloat(sellPrice)).toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowSellModal(false)}
                className="rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSell}
                className="rounded bg-success py-2 px-6 font-medium text-white hover:bg-opacity-90"
              >
                Sell
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-boxdark">
            <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Add New Stock to Portfolio
            </h3>
            <p className="mb-4 text-sm text-body">
              Cash Available: ${cashAvailable.toFixed(2)}
            </p>
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Stock Symbol (Ticker)
              </label>
              <input
                type="text"
                value={newStockSymbol}
                onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL, TSLA"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2.5 block font-medium text-black dark:text-white">
                Number of Shares
              </label>
              <input
                type="number"
                value={newStockShares}
                onChange={(e) => setNewStockShares(e.target.value)}
                placeholder="Enter number of shares"
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowAddStockModal(false);
                  setNewStockSymbol('');
                  setNewStockShares('');
                }}
                className="rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewStock}
                className="rounded bg-primary py-2 px-6 font-medium text-white hover:bg-opacity-90"
              >
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Portfolio;
