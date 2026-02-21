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
    apiBaseUrl: 'https://limitless-sea-53782-2c45e56f3e92.herokuapp.com/api',
    endpoints: {
      users: '/users/getAllUsers'
    },
    authRequired: false
    // Add authentication headers when needed
    // headers: {
    //   'Authorization': 'Bearer YOUR_TOKEN',
    //   'X-API-Key': 'YOUR_API_KEY'
    // }
  }
};

// S3 bucket configuration for images
const S3_CONFIG = {
  baseUrl: 'https://jiffystorebucket.s3.ap-south-1.amazonaws.com/'
};

// Set current environment (change to 'prod' when ready)
const ENV = 'prod';  // Using production API

// Export current configuration
const API_CONFIG = CONFIG[ENV];

// Suggestions API (internal match service)
const SUGGESTIONS_API = {
  baseUrl: 'http://localhost:5003',
  endpoints: {
    save: '/api/suggestions/save'
  }
};
