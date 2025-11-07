import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartFour = () => {
    
    const holdings = [
        { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, avgPrice: 150.50, currentPrice: 178.25, value: 8912.50 },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, avgPrice: 120.00, currentPrice: 142.80, value: 3570.00 },
        { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 40, avgPrice: 310.00, currentPrice: 378.91, value: 15156.40 },
        { symbol: 'TSLA', name: 'Tesla Inc.', shares: 15, avgPrice: 220.00, currentPrice: 242.84, value: 3642.60 },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 30, avgPrice: 135.00, currentPrice: 178.35, value: 5350.50 },
    ];

  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
  const [initialInvestment, setInitialInvestment] = useState(totalValue);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [years, setYears] = useState(20);

  const calculateFutureValue = () => {
    const monthlyRate = annualReturn / 100 / 12;
    const totalMonths = years * 12;
    
    // Future value of initial investment
    const futureValueInitial = initialInvestment * Math.pow(1 + monthlyRate, totalMonths);
    
    // Future value of monthly contributions (annuity)
    const futureValueContributions = monthlyContribution * 
      ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
    
    return futureValueInitial + futureValueContributions;
  };

  const generateProjectionData = () => {
    const data = [];
    const monthlyRate = annualReturn / 100 / 12;
    
    let currentValue = initialInvestment;
    
    for (let year = 0; year <= years; year++) {
      data.push({
        year,
        value: currentValue
      });
      
      // Calculate growth for the next year (month by month with contributions)
      for (let month = 1; month <= 12 && year < years; month++) {
        currentValue = currentValue * (1 + monthlyRate) + monthlyContribution;
      }
    }
    
    return data;
  };

  const futureValue = calculateFutureValue();
  const projectionData = generateProjectionData();
  const totalContributions = initialInvestment + (monthlyContribution * years * 12);
  const totalGrowth = futureValue - totalContributions;

  const chartOptions = {
    chart: {
      height: 220,
      type: 'line',
      fontFamily: 'Satoshi, sans-serif',
      zoom: {
        enabled: false
      },
      toolbar: {
        show: false
      }
    },
    colors: ['#3C50E0'],
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.1
      }
    },
    markers: {
      size: 3,
      hover: {
        size: 5
      }
    },
    xaxis: {
      categories: projectionData.map(data => data.year),
      title: {
        text: 'Years',
        style: {
          color: '#64748B',
          fontSize: '11px',
          fontWeight: 400
        }
      },
      labels: {
        style: {
          colors: '#64748B',
          fontSize: '10px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Value ($)',
        style: {
          color: '#64748B',
          fontSize: '11px',
          fontWeight: 400
        }
      },
      labels: {
        formatter: function (value) {
          if (value >= 1000000) {
            return '$' + (value / 1000000).toFixed(1) + 'M';
          } else if (value >= 1000) {
            return '$' + (value / 1000).toFixed(0) + 'K';
          }
          return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 0 });
        },
        style: {
          colors: '#64748B',
          fontSize: '10px'
        }
      }
    },
    tooltip: {
      y: {
        formatter: function (value) {
          return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
    }
  };

  const chartSeries = [{
    name: 'Portfolio Value',
    data: projectionData.map(data => data.value)
  }];

  return (
    <div className="col-span-12 xl:col-span-7 rounded-sm border border-stroke bg-white px-4 pb-4 pt-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-black dark:text-white">
          Investment Growth Projection
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-1">
            Initial ($)
          </label>
          <input
            type="number"
            value={initialInvestment}
            onChange={(e) => setInitialInvestment(Number(e.target.value))}
            className="w-full rounded border border-stroke bg-transparent py-1.5 px-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:focus:border-primary"
            min="0"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-1">
            Monthly ($)
          </label>
          <input
            type="number"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            className="w-full rounded border border-stroke bg-transparent py-1.5 px-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:focus:border-primary"
            min="0"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-1">
            Return (%)
          </label>
          <input
            type="number"
            value={annualReturn}
            onChange={(e) => setAnnualReturn(Number(e.target.value))}
            className="w-full rounded border border-stroke bg-transparent py-1.5 px-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:focus:border-primary"
            min="0"
            max="50"
            step="0.1"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-black dark:text-white mb-1">
            Years
          </label>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full rounded border border-stroke bg-transparent py-1.5 px-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark dark:focus:border-primary"
            min="1"
            max="50"
          />
        </div>
      </div>

      <div className="mb-4">
        <div id="chartFour">
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="line"
            height={220}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded bg-blue-50 dark:bg-blue-900/20 p-3 text-center border border-blue-200 dark:border-blue-800">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            ${futureValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-blue-600/80 dark:text-blue-400/80 font-medium">
            Future Value
          </div>
        </div>
        
        <div className="rounded bg-gray-50 dark:bg-gray-800 p-3 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-lg font-bold text-gray-600 dark:text-gray-300">
            ${totalContributions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-600/80 dark:text-gray-400 font-medium">
            Total Contributions
          </div>
        </div>
        
        <div className="rounded bg-green-50 dark:bg-green-900/20 p-3 text-center border border-green-200 dark:border-green-800">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            ${totalGrowth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-green-600/80 dark:text-green-400/80 font-medium">
            Total Growth
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
        <p>Assumes {annualReturn}% annual return • Compounded monthly</p>
      </div>
    </div>
  );
};

export default ChartFour;