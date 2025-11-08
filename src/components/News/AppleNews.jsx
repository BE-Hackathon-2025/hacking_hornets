import React, { useState, useEffect } from 'react';

const AppleNews = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppleNews();
  }, []);

  const fetchAppleNews = async () => {
    try {
      // Using NewsAPI - you'll need to sign up for a free API key at https://newsapi.org/
      const API_KEY = import.meta.env.VITE_NEWS_API_KEY || 'demo'; // Add your API key to .env
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=Apple+stock+OR+AAPL&sortBy=publishedAt&pageSize=3&apiKey=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching Apple news:', error);
      // Fallback to mock data if API fails
      setArticles([
        {
          title: "Apple Stock Reaches New Heights Amid Strong iPhone Sales",
          url: "#",
          source: { name: "Financial Times" }
        },
        {
          title: "Analysts Upgrade Apple Price Target Following Services Growth",
          url: "#",
          source: { name: "Bloomberg" }
        },
        {
          title: "Apple's AI Strategy Impresses Wall Street Investors",
          url: "#",
          source: { name: "Reuters" }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white p-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
      <div className="mb-6">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          News
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Latest updates on Apple (AAPL)
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.slice(0, 3).map((article, index) => (
            <a
              key={index}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-black dark:text-white line-clamp-2 mb-1">
                    {article.title}
                  </h5>
                  {article.source && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {article.source.name}
                    </p>
                  )}
                </div>
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}

      {!loading && articles.length === 0 && (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          No news available at the moment.
        </div>
      )}
    </div>
  );
};

export default AppleNews;
