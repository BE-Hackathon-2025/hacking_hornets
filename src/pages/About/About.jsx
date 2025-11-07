import React from 'react';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

const About = () => {
  return (
    <>
      <Breadcrumb pageName="About Money Talks" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
          <h3 className="font-medium text-black dark:text-white">
            About Money Talks
          </h3>
        </div>
        <div className="p-6.5">
          <div className="mb-6">
            <h4 className="text-xl font-semibold text-black dark:text-white mb-3">
              AI-Powered Investment Portfolio Management
            </h4>
            <p className="text-bodydark dark:text-bodydark1 leading-relaxed">
              Money Talks is an intelligent investment portfolio management platform that combines real-time market data with AI-powered insights to help you make informed investment decisions.
            </p>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-black dark:text-white mb-3">
              How It Works
            </h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  1
                </div>
                <div>
                  <h5 className="font-semibold text-black dark:text-white mb-1">Track Your Portfolio</h5>
                  <p className="text-bodydark dark:text-bodydark1">
                    Monitor your investments in real-time with comprehensive analytics. View your total portfolio value, gains/losses, and individual stock performance all in one place.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  2
                </div>
                <div>
                  <h5 className="font-semibold text-black dark:text-white mb-1">Build Your Watchlist</h5>
                  <p className="text-bodydark dark:text-bodydark1">
                    Keep track of stocks you're interested in without committing to purchase. Monitor price movements, market trends, and key metrics to identify the perfect entry points.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  3
                </div>
                <div>
                  <h5 className="font-semibold text-black dark:text-white mb-1">Get AI Insights</h5>
                  <p className="text-bodydark dark:text-bodydark1">
                    Leverage our AI assistant to analyze market trends, get stock recommendations, and understand complex financial concepts. Ask questions about your portfolio or any stock in natural language.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  4
                </div>
                <div>
                  <h5 className="font-semibold text-black dark:text-white mb-1">Make Informed Decisions</h5>
                  <p className="text-bodydark dark:text-bodydark1">
                    Use real-time data from major tech stocks (Google, Apple, Microsoft) and comprehensive market analytics to make data-driven investment decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-black dark:text-white mb-3">
              Key Features
            </h4>
            <ul className="space-y-2 text-bodydark dark:text-bodydark1">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-meta-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span><strong>Real-Time Stock Data:</strong> Live price updates from Polygon.io for major tech stocks</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-meta-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span><strong>Portfolio Management:</strong> Track holdings, transactions, and overall performance</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-meta-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span><strong>Stock Watchlist:</strong> Monitor potential investments before buying</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-meta-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span><strong>AI Assistant:</strong> Natural language interface for market insights and analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-meta-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span><strong>Dark Mode Support:</strong> Comfortable viewing in any lighting condition</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-meta-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span><strong>Comprehensive Analytics:</strong> Detailed metrics including P/E ratios, market cap, volume, and more</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-2 dark:bg-meta-4 rounded-lg p-5">
            <h4 className="text-lg font-semibold text-black dark:text-white mb-3">
              Get Started
            </h4>
            <p className="text-bodydark dark:text-bodydark1 mb-3">
              Ready to take control of your investments? Navigate through the sidebar to explore:
            </p>
            <ul className="space-y-2 text-bodydark dark:text-bodydark1">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span><strong>Dashboard:</strong> Overview of your financial status</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span><strong>Portfolio:</strong> Manage your holdings and transactions</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span><strong>Watchlist:</strong> Track stocks you're considering</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span><strong>AI Assistant:</strong> Chat with our AI for investment insights</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default About;
