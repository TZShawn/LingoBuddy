// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev';

// To use this:
// 1. Create a .env file in the frontend directory
// 2. Add: VITE_API_BASE_URL=https://your-actual-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev
// 3. Replace with your real API Gateway URL after deploying the backend
