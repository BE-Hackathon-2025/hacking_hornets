import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useAuth } from '../../contexts/AuthContext';
import { getHistoricalStockData } from '../../services/stockDataService';

const ChartOne = ({ portfolio }) => {
  const { currentUser } = useAuth();
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (portfolio && portfolio.holdings && currentUser) {
      fetchHistoricalData();
    }
  }, [portfolio, currentUser]);

  const fetchHistoricalData = async () => {
    try {
      const symbols = portfolio.holdings.map(h => h.symbol);
      
      // Get date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const formatDate = (date) => date.toISOString().split('T')[0];

      // Fetch historical data for all symbols (with caching)
      const fetchPromises = symbols.map(async (symbol) => {
        const result = await getHistoricalStockData(
          currentUser.uid,
          symbol,
          formatDate(startDate),
          formatDate(endDate)
        );
        
        if (result.success && result.data.results.length > 0) {
          return {
            name: symbol,
            data: result.data.results.map(r => r.close) // closing prices
          };
        }
        return { name: symbol, data: [] };
      });

      const results = await Promise.all(fetchPromises);
      
      // Generate date labels from the first result
      if (results.length > 0 && results[0].data.length > 0) {
        const firstResult = await getHistoricalStockData(
          currentUser.uid,
          symbols[0],
          formatDate(startDate),
          formatDate(endDate)
        );
        
        if (firstResult.success && firstResult.data.results) {
          const dates = firstResult.data.results.map(r => {
            const date = new Date(r.timestamp);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          });
          setCategories(dates);
        }
      }
      
      setSeries(results.filter(r => r.data.length > 0));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      setLoading(false);
    }
  };

  if (!portfolio || !portfolio.holdings || loading) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
    min: 0,
    max: 100,
  },
};

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
