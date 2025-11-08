import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUserWatchlist,
  addToWatchlist,
  removeFromWatchlist
} from '../../services/firestoreService';
import toast from 'react-hot-toast';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import CardDataStats from '../../components/CardDataStats';
import AuthPrompt from '../../components/AuthPrompt';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "../../firebase/config";

const Watchlist = () => {
  const { currentUser } = useAuth();
  const [watchlistStocks, setWatchlistStocks] = useState([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Load watchlist on mount
  useEffect(() => {
    if (currentUser) {
      loadWatchlist();
    }
  }, [currentUser]);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const result = await getUserWatchlist(currentUser.uid);
      if (result.success) {
        setWatchlistStocks(result.data);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
      toast.error('Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stock data from Polygon API
  const fetchStockData = async (symbol) => {
    try {
      const API_KEY = import.meta.env.VITE_POLYGON_API_KEY;
      
      // Get current quote
      const quoteResponse = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${API_KEY}`
      );
      const quoteData = await quoteResponse.json();
      
      // Get ticker details for company name
      const detailsResponse = await fetch(
        `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${API_KEY}`
      );
      const detailsData = await detailsResponse.json();
      
      if (quoteData.results && quoteData.results.length > 0) {
        const result = quoteData.results[0];
        const change = result.c - result.o;
        const changePercent = (change / result.o) * 100;
        
        return {
          symbol: symbol,
          name: detailsData.results?.name || symbol,
          currentPrice: result.c,
          change: change,
          changePercent: changePercent,
          dayHigh: result.h,
          dayLow: result.l,
          volume: result.v.toString(),
          marketCap: detailsData.results?.market_cap?.toString() || 'N/A',
          peRatio: 'N/A' // Polygon doesn't provide P/E ratio in free tier
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching stock data:', error);
      return null;
    }
  };

  const handleRemoveStock = async (stockId, symbol) => {
    try {
      await removeFromWatchlist(currentUser.uid, stockId);
      setWatchlistStocks(watchlistStocks.filter(stock => stock.id !== stockId));
      toast.success(`${symbol} removed from watchlist`);
    } catch (error) {
      console.error('Error removing stock:', error);
      toast.error('Failed to remove stock');
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    try {
      setAdding(true);
      const upperSymbol = newSymbol.toUpperCase();
      
      // Check if stock already in watchlist
      if (watchlistStocks.some(stock => stock.symbol === upperSymbol)) {
        toast.error('Stock already in watchlist');
        setAdding(false);
        return;
      }

      // Fetch stock data from API
      const stockData = await fetchStockData(upperSymbol);
      
      if (stockData) {
        // Add to Firestore
        const result = await addToWatchlist(currentUser.uid, stockData);
        if (result.success) {
          // Reload watchlist
          await loadWatchlist();
          toast.success(`${upperSymbol} added to watchlist`);
          setNewSymbol('');
          setShowAddForm(false);
        }
      } else {
        toast.error('Could not find stock data. Please check the symbol.');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Failed to add stock to watchlist');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const gainers = watchlistStocks.filter(s => s.change > 0).length;
  const losers = watchlistStocks.filter(s => s.change < 0).length;
  const avgChange = watchlistStocks.length > 0 
    ? (watchlistStocks.reduce((sum, s) => sum + s.changePercent, 0) / watchlistStocks.length).toFixed(2)
    : '0.00';

  return (
    <>
      <Breadcrumb pageName="Watchlist" />

      {/* Watchlist Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        <CardDataStats 
          title="Stocks Watched" 
          total={watchlistStocks.length.toString()} 
          rate="Active" 
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
              d="M11 15.1156C4.19376 15.1156 0.825012 8.61876 0.687512 8.34376C0.584387 8.13751 0.584387 7.86251 0.687512 7.65626C0.825012 7.38126 4.19376 0.918762 11 0.918762C17.8063 0.918762 21.175 7.38126 21.3125 7.65626C21.4156 7.86251 21.4156 8.13751 21.3125 8.34376C21.175 8.61876 17.8063 15.1156 11 15.1156ZM2.26876 8.00001C3.02501 9.27189 5.98126 13.5688 11 13.5688C16.0188 13.5688 18.975 9.27189 19.7313 8.00001C18.975 6.72814 16.0188 2.43126 11 2.43126C5.98126 2.43126 3.02501 6.72814 2.26876 8.00001Z"
              fill=""
            />
            <path
              d="M11 10.9219C9.38438 10.9219 8.07812 9.61562 8.07812 8C8.07812 6.38438 9.38438 5.07812 11 5.07812C12.6156 5.07812 13.9219 6.38438 13.9219 8C13.9219 9.61562 12.6156 10.9219 11 10.9219ZM11 6.625C10.2437 6.625 9.625 7.24375 9.625 8C9.625 8.75625 10.2437 9.375 11 9.375C11.7563 9.375 12.375 8.75625 12.375 8C12.375 7.24375 11.7563 6.625 11 6.625Z"
              fill=""
            />
          </svg>
        </CardDataStats>

        <CardDataStats 
          title="Gainers Today" 
          total={gainers.toString()} 
          rate={watchlistStocks.length > 0 ? `${((gainers/watchlistStocks.length)*100).toFixed(0)}%` : '0%'}
          levelUp
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
              d="M10 0L15 8H5L10 0Z"
              fill=""
            />
          </svg>
        </CardDataStats>

        <CardDataStats 
          title="Losers Today" 
          total={losers.toString()} 
          rate={watchlistStocks.length > 0 ? `${((losers/watchlistStocks.length)*100).toFixed(0)}%` : '0%'}
          levelDown
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
              d="M10 22L5 14H15L10 22Z"
              fill=""
            />
          </svg>
        </CardDataStats>

        <CardDataStats 
          title="Average Change" 
          total={`${avgChange}%`} 
          rate="Today" 
          levelUp={avgChange >= 0}
          levelDown={avgChange < 0}
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
              d="M21.1063 18.0469L19.3875 3.23126C19.2157 1.71876 17.9438 0.584381 16.3969 0.584381H5.56878C4.05628 0.584381 2.78441 1.71876 2.57816 3.23126L0.859406 18.0469C0.756281 18.9063 1.03128 19.7313 1.61566 20.3844C2.20003 21.0375 2.99066 21.3813 3.85003 21.3813H18.1157C18.975 21.3813 19.8 21.0031 20.35 20.3844C20.9 19.7656 21.2094 18.9063 21.1063 18.0469Z"
              fill=""
            />
          </svg>
        </CardDataStats>
      </div>

      {/* Add Stock Button */}
      <div className="mt-4 md:mt-6 2xl:mt-7.5">
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 4V16M4 10H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Add Stock to Watchlist
          </button>
        )}

        {showAddForm && (
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <form onSubmit={handleAddStock} className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="Enter stock symbol (e.g., AAPL)"
                  className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="rounded-lg bg-primary px-8 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSymbol('');
                }}
                className="rounded-lg border border-stroke px-8 py-3 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              >
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Watchlist Table */}
      <div className="mt-4 md:mt-6 2xl:mt-7.5">
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="py-6 px-4 md:px-6 xl:px-7.5">
            <h4 className="text-xl font-semibold text-black dark:text-white">
              Your Watchlist
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                    Symbol
                  </th>
                  <th className="min-w-[200px] py-4 px-4 font-medium text-black dark:text-white">
                    Company Name
                  </th>
                  <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                    Price
                  </th>
                  <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                    Change
                  </th>
                  <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                    Day Range
                  </th>
                  <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                    Volume
                  </th>
                  <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                    Market Cap
                  </th>
                  <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">
                    P/E Ratio
                  </th>
                  <th className="py-4 px-4 font-medium text-black dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {watchlistStocks.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center">
                      <p className="text-lg text-bodydark dark:text-bodydark">
                        Your watchlist is empty. Add stocks to start tracking!
                      </p>
                    </td>
                  </tr>
                ) : (
                  watchlistStocks.map((stock, index) => (
                  <tr key={index} className="border-b border-[#eee] dark:border-strokedark">
                    <td className="py-5 px-4 pl-9 xl:pl-11">
                      <h5 className="font-bold text-black dark:text-white">
                        {stock.symbol}
                      </h5>
                    </td>
                    <td className="py-5 px-4">
                      <p className="text-black dark:text-white">
                        {stock.name}
                      </p>
                    </td>
                    <td className="py-5 px-4">
                      <p className="text-black dark:text-white font-semibold">
                        ${stock.currentPrice.toFixed(2)}
                      </p>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex flex-col">
                        <p className={`font-medium ${
                          stock.change >= 0 ? 'text-meta-3' : 'text-meta-1'
                        }`}>
                          {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                        </p>
                        <p className={`inline-flex rounded-full bg-opacity-10 py-1 px-3 text-sm font-medium ${
                          stock.change >= 0
                            ? 'bg-success text-success'
                            : 'bg-danger text-danger'
                        }`}>
                          {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </p>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <p className="text-sm text-black dark:text-white">
                        {stock.dayLow.toFixed(2)} - {stock.dayHigh.toFixed(2)}
                      </p>
                    </td>
                    <td className="py-5 px-4">
                      <p className="text-black dark:text-white">
                        {stock.volume}
                      </p>
                    </td>
                    <td className="py-5 px-4">
                      <p className="text-black dark:text-white">
                        {stock.marketCap}
                      </p>
                    </td>
                    <td className="py-5 px-4">
                      <p className="text-black dark:text-white">
                        {stock.peRatio}
                      </p>
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex items-center space-x-3.5">
                        <button 
                          className="hover:text-primary"
                          title="Add to Portfolio"
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
                          onClick={() => handleRemoveStock(stock.id, stock.symbol)}
                          className="hover:text-danger"
                          title="Remove from Watchlist"
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
                              d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502Z"
                              fill=""
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default Watchlist;
