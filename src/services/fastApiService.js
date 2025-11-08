// FastAPI backend service
import { CheckIfPortfolioCollectionEmpty } from './firestoreService';

const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

/**
 * Get portfolio advice - routes to agent_a or agent_b based on portfolio collection status
 * @param {string} query - User's query
 * @param {object} portfolio - Portfolio data (optional, used for agent_b)
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<object>} - AI advice response with portfolio recommendations
 */
export const getPortfolioAdvice = async (query, portfolio, userId) => {
  try {
    // Check if user has any portfolios
    const { isEmpty } = await CheckIfPortfolioCollectionEmpty(userId);
    
    // Route based on portfolio collection status
    // agent_a: For users with no portfolios (new users)
    // agent_b: For users with existing portfolios (portfolio analysis)
    const endpoint = isEmpty ? '/agent_a' : '/agent_b';
    
    const response = await fetch(`${FASTAPI_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        portfolio: isEmpty ? null : portfolio
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.text();
    const cleanData = data.replace(/^"|"$/g, '');
    return { success: true, data: cleanData, endpoint };
  } catch (error) {
    console.error('Error getting portfolio advice:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get general finance Q&A response
 * @param {string} query - User's finance question
 * @returns {Promise<object>} - Finance answer
 */
export const getFinanceQA = async (query) => {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/finance_qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.text();
    const cleanData = data.replace(/^"|"$/g, '');
    return { success: true, data: cleanData };
  } catch (error) {
    console.error('Error getting finance Q&A:', error);
    return { success: false, error: error.message };
  }
};
