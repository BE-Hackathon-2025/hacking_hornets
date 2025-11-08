import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';

const ChartOne = ({ portfolio }) => {
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (portfolio && portfolio.holdings && portfolio.holdings.length > 0) {
      fetchHistoricalData();
    } else {
      setLoading(false);
    }
  }, [portfolio]);

  const fetchHistoricalData = async () => {
    try {
      const symbols = portfolio.holdings.map(h => h.symbol);
      
      // Generate fake historical data for demo purposes
      console.log('Generating fake historical data for', symbols);
      
      // Generate dates for last 30 days
      const dates = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(`${date.getMonth() + 1}/${date.getDate()}`);
      }
      
      // Generate fake price data for each symbol
      const fakeData = symbols.map(symbol => {
        const basePrice = 100 + Math.random() * 100; // Random base price between 100-200
        const data = [];
        
        for (let i = 0; i < 30; i++) {
          // Generate realistic price movements (±2% daily change)
          const previousPrice = i === 0 ? basePrice : data[i - 1];
          const change = previousPrice * (Math.random() * 0.04 - 0.02); // -2% to +2%
          const newPrice = previousPrice + change;
          data.push(parseFloat(newPrice.toFixed(2)));
        }
        
        return {
          name: symbol,
          data: data
        };
      });
      
      setCategories(dates);
      setSeries(fakeData);
      setLoading(false);
    } catch (error) {
      console.error('Error generating historical data:', error);
      setLoading(false);
    }
  };

  if (!portfolio || !portfolio.holdings || portfolio.holdings.length === 0 || loading) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
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

  const options = {
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
    },
    colors: ['#3C50E0', '#80CAEE', '#10B981', '#F59E0B', '#EF4444'],
    chart: {
      fontFamily: 'Satoshi, sans-serif',
      height: 335,
      type: 'line',
      dropShadow: {
        enabled: true,
        color: '#623CEA14',
        top: 10,
        blur: 4,
        left: 0,
        opacity: 0.1,
      },
      toolbar: {
        show: false,
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 300,
          },
        },
      },
      {
        breakpoint: 1366,
        options: {
          chart: {
            height: 350,
          },
        },
      },
    ],
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    grid: {
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 4,
      colors: '#fff',
      strokeColors: ['#3056D3', '#80CAEE', '#10B981', '#F59E0B', '#EF4444'],
      strokeWidth: 3,
      strokeOpacity: 0.9,
      strokeDashArray: 0,
      fillOpacity: 1,
      discrete: [],
      hover: {
        size: undefined,
        sizeOffset: 5,
      },
    },
    xaxis: {
      type: 'category',
      categories: categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      title: {
        style: {
          fontSize: '0px',
        },
      },
      labels: {
        formatter: function (value) {
          return '$' + value.toFixed(2);
        },
      },
    },
  };

  // Don't render chart if we don't have valid data
  if (series.length === 0 || categories.length === 0) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <p className="text-gray-500 dark:text-gray-400">No data available to display chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div className="flex w-full flex-wrap gap-3 sm:gap-5">
          <div className="flex min-w-47.5">
            <div className="w-full">
              <p className="font-semibold text-primary">Portfolio Stock Performance</p>
              <p className="text-sm font-medium">Last 30 Days</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div id="chartOne" className="-ml-5">
          <ReactApexChart
            options={options}
            series={series}
            type="line"
            height={350}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartOne;
