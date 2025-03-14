/**
 * DynamicScout AI Configuration
 * Loads and validates environment variables
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates required environment variables
 * @param {Array} requiredVars - List of required environment variables
 * @throws {Error} If any required variables are missing
 */
function validateEnv(requiredVars) {
  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Define required environment variables
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'APP_SECRET'
];

// Validate required variables
validateEnv(requiredVars);

// Export configuration object
module.exports = {
  // Application settings
  APP_ENV: process.env.APP_ENV || 'development',
  APP_PORT: parseInt(process.env.APP_PORT || '3000', 10),
  APP_SECRET: process.env.APP_SECRET,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  MAX_CONCURRENT_JOBS: parseInt(process.env.MAX_CONCURRENT_JOBS || '5', 10),
  
  // Supabase settings
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  SUPABASE_DATABASE: process.env.SUPABASE_DATABASE || 'dynamicscout',
  
  // LLM configuration
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  DEFAULT_MODEL: process.env.DEFAULT_MODEL || 'anthropic/claude-3-opus',
  LLM_TIMEOUT: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
  
  // Proxy configuration
  USE_PROXIES: process.env.USE_PROXIES === 'true',
  PROXY_SERVICE: process.env.PROXY_SERVICE || 'luminati',
  
  // Luminati proxy settings
  LUMINATI_USERNAME: process.env.LUMINATI_USERNAME,
  LUMINATI_PASSWORD: process.env.LUMINATI_PASSWORD,
  LUMINATI_ZONE: process.env.LUMINATI_ZONE,
  
  // Scraper settings
  SCRAPER_TIMEOUT: parseInt(process.env.SCRAPER_TIMEOUT || '60000', 10),
  SCRAPER_USER_AGENT: process.env.SCRAPER_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  SCRAPER_DEFAULT_DELAY: parseInt(process.env.SCRAPER_DEFAULT_DELAY || '2000', 10),
  SCRAPER_MAX_RETRIES: parseInt(process.env.SCRAPER_MAX_RETRIES || '3', 10),
  SCRAPER_CONCURRENCY: parseInt(process.env.SCRAPER_CONCURRENCY || '2', 10),
  
  // Browser extension settings
  EXTENSION_API_URL: process.env.EXTENSION_API_URL || 'http://localhost:3000/api',
  EXTENSION_RECORDING_INTERVAL: parseInt(process.env.EXTENSION_RECORDING_INTERVAL || '500', 10),
  
  // Security settings
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost,http://localhost:80',
  API_RATE_LIMIT: parseInt(process.env.API_RATE_LIMIT || '100', 10),
  API_RATE_WINDOW: parseInt(process.env.API_RATE_WINDOW || '600000', 10)
};
