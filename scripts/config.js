// API Configuration
const CONFIG = {
  // Development environment - using local mock data
  dev: {
    apiBaseUrl: './api',
    endpoints: {
      users: '/users.json'
    },
    authRequired: false
  },
  
  // Production environment - replace with actual backend URL
  prod: {
    apiBaseUrl: 'https://your-backend-api.com/api',
    endpoints: {
      users: '/users'
    },
    authRequired: false,
    // Add authentication headers when needed
    headers: {
      // 'Authorization': 'Bearer YOUR_TOKEN',
      // 'X-API-Key': 'YOUR_API_KEY'
    }
  }
};

// Set current environment (change to 'prod' when ready)
const ENV = 'dev';

// Export current configuration
const API_CONFIG = CONFIG[ENV];
