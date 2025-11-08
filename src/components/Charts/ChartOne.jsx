import React, { useState, useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartOne = ({ portfolio }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!portfolio?.holdings?.length) {
      setChartData(null);
      return;
    }

    // Generate 30 days of dates
    const dates = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(`${date.getMonth() + 1}/${date.getDate()}`);
    }

    // Generate price data for each stock
    const seriesData = portfolio.holdings.map(holding => {
      const basePrice = 100 + Math.random() * 100;
      const prices = [];
      
      for (let i = 0; i < 30; i++) {
        const prevPrice = i === 0 ? basePrice : prices[i - 1];
        const change = prevPrice * (Math.random() * 0.04 - 0.02);
        prices.push(Number((prevPrice + change).toFixed(2)));
      }

      return {
        name: holding.symbol,
        data: prices
      };
    });

    setChartData({
      series: seriesData,
      categories: dates
    });
  }, [portfolio]);

  const options = useMemo(() => {
    if (!chartData) return null;

    return {
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'left',
      },
      colors: ['#3C50E0', '#80CAEE', '#10B981', '#F59E0B', '#EF4444'],
      chart: {
        fontFamily: 'Satoshi, sans-serif',
        type: 'line',
        toolbar: { show: false },
        animations: { enabled: true }
      },
      stroke: {
        width: 2,
        curve: 'smooth',
      },
      dataLabels: {
        enabled: false,
      },
      markers: {
        size: 0,
        hover: { size: 5 }
      },
      xaxis: {
        type: 'category',
        categories: chartData.categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (value) => '$' + value.toFixed(2)
        },
      },
      grid: {
        show: true,
        strokeDashArray: 5,
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (value) => '$' + value.toFixed(2)
        }
      }
    };
  }, [chartData]);

  if (!portfolio?.holdings?.length) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <p className="text-gray-500 dark:text-gray-400">No holdings to display</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap mb-4">
        <div className="flex w-full flex-wrap gap-3 sm:gap-5">
          <div className="flex min-w-47.5">
            <div className="w-full">
              <p className="font-semibold text-primary">Portfolio Stock Performance</p>
              <p className="text-sm font-medium">Last 30 Days</p>
            </div>
          </div>
        </div>
      </div>

      <div id="chartOne" className="-ml-5">
        <ReactApexChart
          options={options}
          series={chartData.series}
          type="line"
          height={350}
        />
      </div>
    </div>
  );
};

export default ChartOne;
