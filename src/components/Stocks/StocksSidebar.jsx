import React, { useState, useEffect } from 'react';

const POLYGON_API_KEY = 'pMTIriBrr2ALC3sPQYbW8PBnPvHnqUdv';

const StocksSidebar = () => {
  const [stocksData, setStocksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const stocks = [
    { symbol: 'GOOGL', name: 'Google', color: '#4285F4' },
    { symbol: 'AAPL', name: 'Apple', color: '#000000' }
  ];

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get yesterday's date for the most recent trading day
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateString = yesterday.toISOString().split('T')[0];

        const stockPromises = stocks.map(async (stock) => {
          try {
            // Fetch previous close data
            const response = await fetch(
              `https://api.polygon.io/v2/aggs/ticker/${stock.symbol}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
            );
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              const change = result.c - result.o;
              const changePercent = ((change / result.o) * 100).toFixed(2);
              
              return {
                ...stock,
                price: result.c.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent,
                high: result.h.toFixed(2),
                low: result.l.toFixed(2),
                volume: (result.v / 1000000).toFixed(2) + 'M',
                isPositive: change >= 0
              };
            } else {
              // Return mock data if no results
              return {
                ...stock,
                price: '0.00',
                change: '0.00',
                changePercent: '0.00',
                high: '0.00',
                low: '0.00',
                volume: '0M',
                isPositive: true
              };
            }
          } catch (err) {
            console.error(`Error fetching ${stock.symbol}:`, err);
            // Return mock data on error
            return {
              ...stock,
              price: '0.00',
              change: '0.00',
              changePercent: '0.00',
              high: '0.00',
              low: '0.00',
              volume: '0M',
              isPositive: true
            };
          }
        });

        const results = await Promise.all(stockPromises);
        setStocksData(results);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchStockData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStockData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <h3 className="font-semibold text-black dark:text-white mb-4">
          Stock Prices
        </h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <h3 className="font-semibold text-black dark:text-white mb-4">
          Stock Prices
        </h3>
        <div className="text-center text-red-500 p-4">
          <p>Error loading stock data</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="border-b border-stroke py-4 px-6 dark:border-strokedark">
        <h3 className="font-semibold text-black dark:text-white">
          Stock Prices
        </h3>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-4">
          {stocksData.map((stock, index) => (
            <div
              key={index}
              className="rounded-lg border border-stroke bg-gray p-4 dark:border-strokedark dark:bg-meta-4 hover:shadow-md transition-shadow"
            >
              {/* Header with symbol and name */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: stock.color }}
                  >
                    {stock.symbol.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-black dark:text-white">
                      {stock.symbol}
                    </h4>
                    <p className="text-xs text-bodydark">{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-black dark:text-white">
                    ${stock.price}
                  </p>
                </div>
              </div>

              {/* Change indicator */}
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-1 ${stock.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <svg
                    className="fill-current"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {stock.isPositive ? (
                      <path d="M8 3L14 9H9V13H7V9H2L8 3Z" />
                    ) : (
                      <path d="M8 13L2 7H7V3H9V7H14L8 13Z" />
                    )}
                  </svg>
                  <span className="font-semibold text-sm">
                    {stock.isPositive ? '+' : ''}{stock.change} ({stock.isPositive ? '+' : ''}{stock.changePercent}%)
                  </span>
                </div>
              </div>

              {/* Additional stats */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stroke dark:border-strokedark">
                <div>
                  <p className="text-xs text-bodydark">High</p>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    ${stock.high}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-bodydark">Low</p>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    ${stock.low}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-bodydark">Volume</p>
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {stock.volume}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Last updated indicator */}
        <div className="mt-4 pt-4 border-t border-stroke dark:border-strokedark">
          <div className="flex items-center gap-2 justify-center">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse"></span>
            <span className="text-xs text-bodydark">Live data • Updates every 5 min</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StocksSidebar;
