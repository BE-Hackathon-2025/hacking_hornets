/**
 * Global API Rate Limiter for Polygon API
 * Ensures all API requests across the app are properly spaced to avoid 429 errors
 * Polygon Free Tier: 5 requests per minute = 1 request every 12 seconds to be safe
 */

class ApiRateLimiter {
  constructor(minDelay = 12000) {
    this.minDelay = minDelay; // Minimum delay between requests in ms (12 seconds = 5 per minute)
    this.queue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
  }

  /**
   * Add a request to the queue
   * @param {Function} requestFn - Function that returns a Promise for the API request
   * @returns {Promise} - Resolves with the API response
   */
  async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Wait if necessary to respect rate limit
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minDelay - timeSinceLastRequest)
        );
      }

      const { requestFn, resolve, reject } = this.queue.shift();
      
      try {
        this.lastRequestTime = Date.now();
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get the current queue size
   */
  getQueueSize() {
    return this.queue.length;
  }

  /**
   * Clear the queue (useful for cleanup)
   */
  clearQueue() {
    this.queue = [];
    this.isProcessing = false;
  }
}

// Export a singleton instance
// 12 seconds between requests = 5 requests per minute (Polygon free tier limit)
export const polygonRateLimiter = new ApiRateLimiter(12000);
