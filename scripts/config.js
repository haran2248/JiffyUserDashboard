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

// Set current environment (change to 'prod' when ready)
const ENV = 'prod';  // Using local backend

// Export current configuration
const API_CONFIG = CONFIG[ENV];

// Suggestions API (internal match service)
const SUGGESTIONS_API = {
  baseUrl: 'https://limitless-sea-53782-2c45e56f3e92.herokuapp.com',
  endpoints: {
    save: '/api/suggestions/save'
  }
};

// AI API (Python agent for pitch generation)
const AI_API = {
  baseUrl: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:8080'
    : (ENV === 'dev' ? 'http://localhost:8080' : 'https://jiffypythonagent-git-923840009509.asia-south1.run.app'),
  endpoints: {
    generatePitch: '/match/pitch/generate'
  }
};
