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
    if (portfolio && portfolio.holdings && currentUser) {
      fetchStockPrices();
    }
  }, [portfolio, currentUser]);

  const fetchStockPrices = async () => {
    try {
      const symbols = portfolio.holdings.map(h => h.symbol);

      // Fetch current prices (with caching)
      const result = await getCurrentStockPrices(currentUser.uid, symbols);
      
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

  if (!portfolio || !portfolio.holdings || loading) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-5">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
        <div className="sm:w-1/2 w-full px-8">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-primary"></span>
            <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
              <span> {holdingsWithPercentage[0].symbol} </span>
              <span> {holdingsWithPercentage[0].percentage}% </span>
            </p>
          </div>
        </div>
        <div className="sm:w-1/2 w-full px-8">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#6577F3]"></span>
            <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
              <span> {holdingsWithPercentage[1].symbol} </span>
              <span> {holdingsWithPercentage[1].percentage}% </span>
            </p>
          </div>
        </div>
        <div className="sm:w-1/2 w-full px-8">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#8FD0EF]"></span>
            <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
              <span> {holdingsWithPercentage[2].symbol} </span>
              <span> {holdingsWithPercentage[2].percentage}% </span>
            </p>
          </div>
        </div>
        <div className="sm:w-1/2 w-full px-8">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#0FADCF]"></span>
            <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
              <span> {holdingsWithPercentage[3].symbol} </span>
              <span> {holdingsWithPercentage[3].percentage}% </span>
            </p>
          </div>
        </div>
        <div className="sm:w-1/2 w-full px-8">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#1E90FF]"></span>
            <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
              <span> {holdingsWithPercentage[4].symbol} </span>
              <span> {holdingsWithPercentage[4].percentage}% </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartThree;