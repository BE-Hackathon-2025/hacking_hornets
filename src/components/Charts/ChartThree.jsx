import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentStockPrices } from '../../services/stockDataService';

const ChartThree = ({ portfolio }) => {
  const { currentUser } = useAuth();
  const [stockPrices, setStockPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({ series: [] });

  useEffect(() => {
    if (portfolio && portfolio.holdings && portfolio.holdings.length > 0 && currentUser) {
      fetchStockPrices();
      
      // Set up background refresh after 1 minute
      const refreshTimer = setTimeout(() => {
        console.log('Background refresh: Updating chart prices after 1 minute');
        fetchStockPrices(true); // Force refresh
      }, 60000); // 60 seconds
      
      return () => clearTimeout(refreshTimer);
    } else {
      setLoading(false);
    }
  }, [portfolio, currentUser]);

  const fetchStockPrices = async (forceRefresh = false) => {
    try {
      const symbols = portfolio.holdings.map(h => h.symbol);

      // Fetch current prices (cache first, then API if needed)
      const result = await getCurrentStockPrices(currentUser.uid, symbols, forceRefresh);
      
      if (result.success) {
        const prices = {};
        Object.entries(result.data).forEach(([symbol, data]) => {
          prices[symbol] = data.price;
        });
        setStockPrices(prices);
        
        // Calculate chart data
        const holdings = portfolio.holdings.map(holding => ({
          ...holding,
          currentPrice: prices[holding.symbol] || 0,
          value: holding.shares * (prices[holding.symbol] || 0)
        }));
        const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value);
        setChartData({ series: sortedHoldings.map(h => h.value) });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stock prices:', error);
      setLoading(false);
    }
  };

  if (!portfolio || !portfolio.holdings || portfolio.holdings.length === 0 || loading) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-5">
        <div className="flex items-center justify-center h-full min-h-[300px]">
          {loading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No holdings to display</p>
          )}
        </div>
      </div>
    );
  }

  // Calculate holdings with current prices
  const holdings = portfolio.holdings.map(holding => ({
    ...holding,
    currentPrice: stockPrices[holding.symbol] || 0,
    value: holding.shares * (stockPrices[holding.symbol] || 0)
  }));

  // Sort holdings by value (biggest to smallest) and calculate percentages
  const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value);
  const totalValue = sortedHoldings.reduce((sum, holding) => sum + holding.value, 0);
  const holdingsWithPercentage = sortedHoldings.map(holding => ({
    ...holding,
    percentage: totalValue > 0 ? (holding.value / totalValue * 100).toFixed(1) : 0
  }));

  // Additional safety check - ensure we have valid data before rendering chart
  if (holdingsWithPercentage.length === 0 || chartData.series.length === 0 || totalValue === 0) {
    return (
      <div className="sm:px-7.5 col-span-12 rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-5">
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <p className="text-gray-500 dark:text-gray-400">No holdings data to display</p>
        </div>
      </div>
    );
  }

  const options = {
    chart: {
      fontFamily: 'Satoshi, sans-serif',
      type: 'donut',
    },
    colors: ['#3C50E0', '#6577F3', '#8FD0EF', '#0FADCF', '#1E90FF'],
    labels: holdingsWithPercentage.map(holding => holding.symbol),
    legend: {
      show: false,
      position: 'bottom',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          background: 'transparent',
        },
        startAngle: 0,
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      y: {
        formatter: function(value, { seriesIndex }) {
          const holding = holdingsWithPercentage[seriesIndex];
          return `${holding.name}: ${holding.percentage}%`;
        }
      }
    },
    responsive: [
      {
        breakpoint: 2600,
        options: {
          chart: {
            width: 380,
          },
        },
      },
      {
        breakpoint: 640,
        options: {
          chart: {
            width: 200,
          },
        },
      },
    ],
  };

  return (
    <div className="sm:px-7.5 col-span-12 rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-5">
      <div className="mb-3 justify-between gap-4 sm:flex">
        <div>
          <h5 className="text-xl font-semibold text-black dark:text-white">
            Portfolio Holdings
          </h5>
        </div>
        <div>
          {/* Removed the dropdown selector */}
        </div>
      </div>

      <div className="mb-2">
        <div id="chartThree" className="mx-auto flex justify-center relative">
          <ReactApexChart
            options={options}
            series={chartData.series}
            type="donut"
          />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-2xl font-bold text-black dark:text-white">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Value
            </div>
          </div>
        </div>
      </div>

      <div className="-mx-8 flex flex-wrap items-center justify-center gap-y-3">
        {holdingsWithPercentage.map((holding, index) => {
          const colors = ['bg-primary', 'bg-[#6577F3]', 'bg-[#8FD0EF]', 'bg-[#0FADCF]', 'bg-[#1E90FF]'];
          const colorClass = colors[index % colors.length];
          
          return (
            <div key={holding.symbol} className="sm:w-1/2 w-full px-8">
              <div className="flex w-full items-center">
                <span className={`mr-2 block h-3 w-full max-w-3 rounded-full ${colorClass}`}></span>
                <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
                  <span> {holding.symbol} </span>
                  <span> {holding.percentage}% </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChartThree;