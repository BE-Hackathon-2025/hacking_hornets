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
  const [selectedStock, setSelectedStock] = useState(null);
  const [sharesToBuy, setSharesToBuy] = useState('');
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
      fetchStockPrices();
      
      // Set up background refresh after 1 minute
      const refreshTimer = setTimeout(() => {
        console.log('Background refresh: Updating stock prices after 1 minute');
        fetchStockPrices(true); // Force refresh
      }, 60000); // 60 seconds
      
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
      } else if (!isInitializing) {
        // Create initial portfolio if none exists and not already initializing
        await initializePortfolio();
      }
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
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.1063 18.0469L19.3875 3.23126C19.2157 1.71876 17.9438 0.584381 16.3969 0.584381H5.56878C4.05628 0.584381 2.78441 1.71876 2.57816 3.23126L0.859406 18.0469C0.756281 18.9063 1.03128 19.7313 1.61566 20.3844C2.20003 21.0375 2.99066 21.3813 3.85003 21.3813H18.1157C18.975 21.3813 19.8 21.0031 20.35 20.3844C20.9 19.7656 21.2094 18.9063 21.1063 18.0469ZM19.2157 19.3531C18.9407 19.6625 18.5625 19.8344 18.15 19.8344H3.85003C3.43753 19.8344 3.05941 19.6625 2.78441 19.3531C2.50941 19.0438 2.37191 18.6313 2.44066 18.2188L4.12503 3.43751C4.19378 2.71563 4.81253 2.16563 5.56878 2.16563H16.4313C17.1532 2.16563 17.7719 2.71563 17.875 3.43751L19.5938 18.2531C19.6282 18.6656 19.4907 19.0438 19.2157 19.3531Z"
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
            width="20"
            height="22"
            viewBox="0 0 20 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.7531 16.4312C10.3781 16.4312 9.27808 17.5312 9.27808 18.9062C9.27808 20.2812 10.3781 21.3812 11.7531 21.3812C13.1281 21.3812 14.2281 20.2812 14.2281 18.9062C14.2281 17.5656 13.0937 16.4312 11.7531 16.4312Z"
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
            height="18"
            viewBox="0 0 22 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.18418 8.03751C9.31543 8.03751 11.0686 6.35313 11.0686 4.25626C11.0686 2.15938 9.31543 0.475006 7.18418 0.475006C5.05293 0.475006 3.2998 2.15938 3.2998 4.25626C3.2998 6.35313 5.05293 8.03751 7.18418 8.03751Z"
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
            height="16"
            viewBox="0 0 22 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11 15.1156C4.19376 15.1156 0.825012 8.61876 0.687512 8.34376C0.584387 8.13751 0.584387 7.86251 0.687512 7.65626C0.825012 7.38126 4.19376 0.918762 11 0.918762C17.8063 0.918762 21.175 7.38126 21.3125 7.65626C21.4156 7.86251 21.4156 8.13751 21.3125 8.34376C21.175 8.61876 17.8063 15.1156 11 15.1156Z"
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
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.7499 2.9812H14.2874V2.36245C14.2874 2.02495 14.0062 1.71558 13.6405 1.71558C13.2749 1.71558 12.9937 1.99683 12.9937 2.36245V2.9812H4.97803V2.36245C4.97803 2.02495 4.69678 1.71558 4.33115 1.71558C3.96553 1.71558 3.68428 1.99683 3.68428 2.36245V2.9812H2.2499C1.29365 2.9812 0.478027 3.7687 0.478027 4.75308V14.5406C0.478027 15.4968 1.26553 16.3125 2.2499 16.3125H15.7499C16.7062 16.3125 17.5218 15.525 17.5218 14.5406V4.72495C17.5218 3.7687 16.7062 2.9812 15.7499 2.9812ZM1.77178 8.21245H4.1624V10.9968H1.77178V8.21245ZM5.42803 8.21245H8.38115V10.9968H5.42803V8.21245ZM8.38115 12.2625V15.0187H5.42803V12.2625H8.38115ZM9.64678 12.2625H12.5999V15.0187H9.64678V12.2625ZM9.64678 10.9968V8.21245H12.5999V10.9968H9.64678ZM13.8374 8.21245H16.228V10.9968H13.8374V8.21245ZM2.2499 4.24683H3.7124V4.83745C3.7124 5.17495 3.99365 5.48433 4.35928 5.48433C4.7249 5.48433 5.00615 5.20308 5.00615 4.83745V4.24683H13.0499V4.83745C13.0499 5.17495 13.3312 5.48433 13.6968 5.48433C14.0624 5.48433 14.3437 5.20308 14.3437 4.83745V4.24683H15.7499C16.0312 4.24683 16.2562 4.47183 16.2562 4.75308V6.94683H1.77178V4.75308C1.77178 4.47183 1.96865 4.24683 2.2499 4.24683ZM1.77178 14.5125V12.2343H4.1624V14.9906H2.2499C1.96865 15.0187 1.77178 14.7937 1.77178 14.5125ZM15.7499 15.0187H13.8374V12.2625H16.228V14.5406C16.2562 14.7937 16.0312 15.0187 15.7499 15.0187Z"
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
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.7499 2.9812H2.2499C1.29365 2.9812 0.478027 3.7687 0.478027 4.75308V14.5406C0.478027 15.4968 1.26553 16.3125 2.2499 16.3125H15.7499C16.7062 16.3125 17.5218 15.525 17.5218 14.5406V4.72495C17.5218 3.7687 16.7062 2.9812 15.7499 2.9812Z"
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
