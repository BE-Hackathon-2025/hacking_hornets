// FastAPI backend service
const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

/**
 * Call the stock finder endpoint
 * @param {string} query - The user's query about stocks
 * @returns {Promise<object>} - Stock recommendations
 */
export const callStockFinder = async (query) => {
  try {
    const response = await fetch(
      `${FASTAPI_BASE_URL}/stock_finder?query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // The API returns plain text, not JSON
    const data = await response.text();
    // Remove quotes if the response is wrapped in quotes
    const cleanData = data.replace(/^"|"$/g, '');
    return { success: true, data: cleanData };
  } catch (error) {
    console.error('Error calling stock finder:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update portfolio with AI recommendations
 * @param {string} ticker - Stock ticker symbol
 * @param {number} amount - Number of shares
 * @returns {Promise<object>} - Update result
 */
export const updatePortfolio = async (ticker, amount) => {
  try {
    const response = await fetch(
      `${FASTAPI_BASE_URL}/update_portfolio?ticker=${encodeURIComponent(ticker)}&amount=${amount}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate portfolio update recommendations
 * @param {string} updateType - Type of update (e.g., "rebalance", "optimize")
 * @returns {Promise<object>} - Update recommendations
 */
export const genUpdatePortfolio = async (updateType) => {
  try {
    const response = await fetch(
      `${FASTAPI_BASE_URL}/gen_update_portfolio?update_type=${encodeURIComponent(updateType)}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error generating portfolio update:', error);
    return { success: false, error: error.message };
  }
};
