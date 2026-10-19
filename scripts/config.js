// API Configuration
const CONFIG = {
  // Development environment - using local backend
  dev: {
    apiBaseUrl: 'http://localhost:5005/api',
    endpoints: {
      users: '/users/getAllUsers',
      createManualUser: '/users/manual',
      upsertManualUserJson: '/users/manual/json'
    },
    authRequired: false
  },

  // Production environment - replace with actual backend URL
  prod: {
    apiBaseUrl: 'https://limitless-sea-53782-2c45e56f3e92.herokuapp.com/api',
    endpoints: {
      users: '/users/getAllUsers',
      createManualUser: '/users/manual',
      upsertManualUserJson: '/users/manual/json'
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

// Set current environment
const ENV = 'prod';  // Using production backend

// Export current configuration
const API_CONFIG = CONFIG[ENV];

// Suggestions API (internal match service)
const SUGGESTIONS_API = {
  baseUrl: (typeof API_CONFIG !== 'undefined' && API_CONFIG.apiBaseUrl)
    ? API_CONFIG.apiBaseUrl.replace(/\/api$/, '')
    : 'https://limitless-sea-53782-2c45e56f3e92.herokuapp.com',
  endpoints: {
    save: '/api/suggestions/save'
  }
};

// AI API (Python agent for pitch generation hosted on Cloud Run)
const AI_API = {
  baseUrl: 'https://jiffypythonagent-git-923840009509.asia-south1.run.app',
  endpoints: {
    generatePitch: '/match/pitch/generate'
  }
};
