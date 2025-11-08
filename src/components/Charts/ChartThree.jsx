import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartThree = () => {
  const holdings = [
    { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, avgPrice: 150.50, currentPrice: 178.25, value: 8912.50 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, avgPrice: 120.00, currentPrice: 142.80, value: 3570.00 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 40, avgPrice: 310.00, currentPrice: 378.91, value: 15156.40 },
    { symbol: 'TSLA', name: 'Tesla Inc.', shares: 15, avgPrice: 220.00, currentPrice: 242.84, value: 3642.60 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 30, avgPrice: 135.00, currentPrice: 178.35, value: 5350.50 },
  ];

  // Sort holdings by value (biggest to smallest) and calculate percentages
  const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value);
  const totalValue = sortedHoldings.reduce((sum, holding) => sum + holding.value, 0);
  const holdingsWithPercentage = sortedHoldings.map(holding => ({
    ...holding,
    percentage: (holding.value / totalValue * 100).toFixed(1)
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

  const [state, setState] = useState({
    series: holdingsWithPercentage.map(holding => holding.value),
  });

  const handleReset = () => {
    setState((prevState) => ({
      ...prevState,
      series: holdingsWithPercentage.map(holding => holding.value),
    }));
  };
  handleReset;

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
            series={state.series}
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